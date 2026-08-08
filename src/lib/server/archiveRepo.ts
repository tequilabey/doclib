import sql from "mssql";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { getPool } from "$lib/server/db";

const ARCHIVE_ROOT = process.env.DOC_ARCHIVE_ROOT?.trim() || "/srv/storage/archive";

export type ArchiveNode = {
  NodeKey: string;
  NodeType: string;
  Label: string;
  DirectCount: number;
  TotalDocCount: number;
  Url: string | null;
  Children: ArchiveNode[];
};

export type ArchiveSelected = {
  documentTypes: string[];
  collections: string[];
  vendorSources: string[];
  titleSearch: string;
};

type DbDoc = {
  documentID: number;
  currentState: string;
  archiveFileName: string;
  archivePath: string | null;
  dtAdded: string;
  collectionPath: string | null;
  mediaTypeName: string | null;
  purposeName: string | null;
  documentType: string | null;
  documentDate: string | null;
  title: string | null;
  vendorSource: string | null;
  amount: string | null;
  catJson: any;
};

type ArchiveFile = {
  absPath: string;
  relPath: string;
  area: "truth" | "derived" | "metadata";
  subtype: string;
  fileName: string;
  stem: string;
  dateKey: string;
};

function splitRel(relPath: string) {
  return relPath.split("/").filter(Boolean);
}

function stemOf(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function node(key: string, type: string, label: string, url: string | null = null): ArchiveNode {
  return {
    NodeKey: key,
    NodeType: type,
    Label: label,
    DirectCount: 0,
    TotalDocCount: 0,
    Url: url,
    Children: []
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function datePartsFromDb(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return ["0000", "00", "00"];

  return [
    String(d.getUTCFullYear()),
    pad2(d.getUTCMonth() + 1),
    pad2(d.getUTCDate())
  ];
}

function docIDFromName(fileName: string): number | null {
  const m = fileName.match(/^D0*([0-9]+)/i);
  return m ? Number(m[1]) : null;
}

function archiveRelFromAbs(absPath: string) {
  const root = path.resolve(ARCHIVE_ROOT);
  const abs = path.resolve(absPath);

  if (!abs.startsWith(root + path.sep)) return null;
  return abs.slice(root.length + 1).replaceAll(path.sep, "/");
}

function toRelUrl(relPath: string) {
  return `/doclib/archive/file?p=${encodeURIComponent(relPath)}`;
}

function makeArchiveFile(area: "truth" | "derived" | "metadata", relUnderArea: string, absPath: string): ArchiveFile | null {
  const parts = splitRel(relUnderArea);
  if (parts.length < 3) return null;

  const fileName = parts[parts.length - 1];

  let subtype = "doc";
  let dateParts: string[];

  if (area === "truth") {
    dateParts = parts.slice(0, -1);
  } else if (area === "metadata") {
    subtype = "sidecar";
    dateParts = parts.slice(0, -1);
  } else {
    subtype = parts[0] || "other";
    dateParts = parts.slice(1, -1);
  }

  return {
    absPath,
    relPath: `${area}/${relUnderArea}`,
    area,
    subtype,
    fileName,
    stem: stemOf(fileName),
    dateKey: dateParts.join("/")
  };
}

async function walkArea(area: "truth" | "derived" | "metadata", absDir: string, relPrefix = ""): Promise<ArchiveFile[]> {
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: ArchiveFile[] = [];

  for (const e of entries) {
    const absPath = path.join(absDir, e.name);
    const rel = relPrefix ? `${relPrefix}/${e.name}` : e.name;

    if (e.isDirectory()) {
      out.push(...await walkArea(area, absPath, rel));
    } else if (e.isFile()) {
      const f = makeArchiveFile(area, rel, absPath);
      if (f) out.push(f);
    }
  }

  return out;
}

function componentMatchesDoc(componentStem: string, truthStem: string) {
  return (
    componentStem === truthStem ||
    componentStem.startsWith(`${truthStem}.`) ||
    componentStem.startsWith(`${truthStem}_`) ||
    componentStem.startsWith(`${truthStem} - `)
  );
}

function fileNode(f: ArchiveFile) {
  return node(`file:${f.relPath}`, "file", f.fileName, toRelUrl(f.relPath));
}

function groupFiles(files: ArchiveFile[], rootKey: string) {
  const groups = new Map<string, ArchiveFile[]>();

  for (const f of files) {
    if (!groups.has(f.subtype)) groups.set(f.subtype, []);
    groups.get(f.subtype)!.push(f);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subtype, groupFiles]) => {
      const g = node(`${rootKey}:${subtype}`, "componentSubtype", subtype);
      g.Children = groupFiles
        .sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: "base" }))
        .map(fileNode);
      return g;
    });
}

function addComponentGroup(docNode: ArchiveNode, label: string, children: ArchiveNode[]) {
  if (children.length === 0) return;

  const g = node(`${docNode.NodeKey}:${label}`, "componentGroup", label);
  g.Children = children;
  docNode.Children.push(g);
}

function getOrAdd(parent: ArchiveNode, key: string, type: string, label: string) {
  let found = parent.Children.find((c) => c.NodeKey === key);
  if (!found) {
    found = node(key, type, label);
    parent.Children.push(found);
  }
  return found;
}

async function fileExists(absPath: string) {
  try {
    const s = await stat(absPath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function truthFileForDoc(doc: DbDoc, truthFiles: ArchiveFile[]) {
  const fileName = doc.archiveFileName;

  if (doc.archivePath) {
    const p = path.resolve(doc.archivePath);

    if (await fileExists(p)) {
      const rel = archiveRelFromAbs(p);
      if (rel) {
        return {
          absPath: p,
          relPath: rel,
          area: "truth" as const,
          subtype: "doc",
          fileName: path.basename(p),
          stem: stemOf(path.basename(p)),
          dateKey: splitRel(rel).slice(1, -1).join("/")
        };
      }
    }

    const joined = path.resolve(doc.archivePath, fileName);
    if (await fileExists(joined)) {
      const rel = archiveRelFromAbs(joined);
      if (rel) {
        return {
          absPath: joined,
          relPath: rel,
          area: "truth" as const,
          subtype: "doc",
          fileName,
          stem: stemOf(fileName),
          dateKey: splitRel(rel).slice(1, -1).join("/")
        };
      }
    }
  }

  return truthFiles.find((f) => f.fileName === fileName) ?? null;
}

function addDbDocToTree(root: ArchiveNode, doc: DbDoc, truth: ArchiveFile | null, derived: ArchiveFile[], metadata: ArchiveFile[]) {
  const dateParts = datePartsFromDb(doc.dtAdded);

  let parent = root;
  let runningKey = "archive";

  for (let i = 0; i < dateParts.length; i++) {
    const part = dateParts[i];
    const type = i === 0 ? "year" : i === 1 ? "month" : "day";
    runningKey += `/${part}`;
    parent = getOrAdd(parent, runningKey, type, part);
  }

  const docLabel = doc.title || doc.archiveFileName;
  const docNode = node(`${runningKey}:doc:${doc.documentID}`, "document", `${docLabel} (#${doc.documentID})`);

  if (truth) {
    addComponentGroup(docNode, "doc", [fileNode(truth)]);
  }

  addComponentGroup(docNode, "derived", groupFiles(derived, `${docNode.NodeKey}:derived`));
  addComponentGroup(docNode, "metadata", groupFiles(metadata, `${docNode.NodeKey}:metadata`));

  parent.Children.push(docNode);
}

function countDocs(n: ArchiveNode): number {
  if (n.NodeType === "document") {
    n.TotalDocCount = 1;
    n.DirectCount = n.Children.length;
    return 1;
  }

  let total = 0;
  for (const c of n.Children) {
    total += countDocs(c);
  }

  n.TotalDocCount = total;
  n.DirectCount = n.Children.filter((c) => c.TotalDocCount > 0 || c.NodeType === "file" || c.Children.length > 0).length;
  return total;
}

function sortTree(n: ArchiveNode) {
  n.Children.sort((a, b) => {
    if (a.NodeType === "document" && b.NodeType === "document") {
      const aid = docIDFromName(a.Label);
      const bid = docIDFromName(b.Label);
      if (aid !== null && bid !== null) return aid - bid;
      if (aid !== null) return -1;
      if (bid !== null) return 1;
    }

    return a.Label.localeCompare(b.Label, undefined, { numeric: true, sensitivity: "base" });
  });

  for (const c of n.Children) sortTree(c);
}

function valueArray(rows: any[] | undefined) {
  return (rows ?? []).map((x) => String(x.value ?? "").trim()).filter(Boolean);
}

async function archiveBrowserDbGet(selected: ArchiveSelected) {
  const pool = await getPool();

  const r = await pool
    .request()
    .input("DocumentTypesJson", sql.NVarChar(sql.MAX), JSON.stringify(selected.documentTypes))
    .input("CollectionsJson", sql.NVarChar(sql.MAX), JSON.stringify(selected.collections))
    .input("VendorSourcesJson", sql.NVarChar(sql.MAX), JSON.stringify(selected.vendorSources))
    .input("TitleSearch", sql.NVarChar(200), selected.titleSearch || null)
    .execute("di.ArchiveBrowser_Get");

  const resultText = r.recordset?.[0]?.ResultJson;
  if (!resultText) {
    throw new Error("di.ArchiveBrowser_Get returned no ResultJson.");
  }

  const envelope = JSON.parse(resultText);
  if (envelope.Status !== "OK") {
    throw new Error(envelope.Message || "Archive browser DB request failed.");
  }

  return envelope.Data;
}

export async function archiveBrowserGet(selected: ArchiveSelected) {
  const dbData = await archiveBrowserDbGet(selected);

  const docs = (dbData.Documents ?? []) as DbDoc[];

  const truthFiles = await walkArea("truth", path.join(ARCHIVE_ROOT, "truth"));
  const derivedFiles = await walkArea("derived", path.join(ARCHIVE_ROOT, "derived"));
  const metadataFiles = await walkArea("metadata", path.join(ARCHIVE_ROOT, "metadata"));

  const root = node("archive", "root", "archive");

  for (const doc of docs) {
    const truth = await truthFileForDoc(doc, truthFiles);

    // Do not show catalog rows that have no actual archived truth file.
    // These can occur during testing or interrupted intake work.
    if (!truth) {
      continue;
    }

    const truthStem = stemOf(doc.archiveFileName);
    const dateKey = truth.dateKey;

    const derived = derivedFiles.filter((d) => {
      if (dateKey && d.dateKey !== dateKey) return false;
      return componentMatchesDoc(d.stem, truthStem);
    });

    const metadata = metadataFiles.filter((m) => {
      if (dateKey && m.dateKey !== dateKey) return false;
      return componentMatchesDoc(m.stem, truthStem);
    });

    addDbDocToTree(root, doc, truth, derived, metadata);
  }

  countDocs(root);
  sortTree(root);

  return {
    Status: "OK",
    Message: "",
    Data: {
      ArchiveRoot: ARCHIVE_ROOT,
      Filters: {
        DocumentTypes: valueArray(dbData.Filters?.DocumentTypes),
        Collections: valueArray(dbData.Filters?.Collections),
        VendorSources: valueArray(dbData.Filters?.VendorSources)
      },
      Selected: selected,
      Tree: root.Children
    }
  };
}

export async function safeArchiveFilePath(relPath: string) {
  const root = path.resolve(ARCHIVE_ROOT);
  const abs = path.resolve(root, relPath);

  if (!abs.startsWith(root + path.sep)) {
    throw new Error("Invalid archive path.");
  }

  const s = await stat(abs);
  if (!s.isFile()) {
    throw new Error("Archive path is not a file.");
  }

  return abs;
}
