import { error } from "@sveltejs/kit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { safeArchiveFilePath } from "$lib/server/archiveRepo";

function contentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".pdf") return "application/pdf";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".csv") return "text/csv; charset=utf-8";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";

  return "application/octet-stream";
}

export async function GET({ url }: any) {
  const relPath = url.searchParams.get("p");
  if (!relPath) throw error(400, "Missing archive file path.");

  let absPath: string;

  try {
    absPath = await safeArchiveFilePath(relPath);
  } catch {
    throw error(404, "Archive file not found.");
  }

  const body = await readFile(absPath);
  const fileName = path.basename(absPath).replaceAll('"', "");

  return new Response(body, {
    headers: {
      "content-type": contentType(fileName),
      "content-disposition": `inline; filename="${fileName}"`
    }
  });
}
