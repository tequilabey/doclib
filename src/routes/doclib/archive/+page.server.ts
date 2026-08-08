import { archiveBrowserGet } from "$lib/server/archiveRepo";

function getAll(url: URL, key: string) {
  return url.searchParams.getAll(key).map((x) => x.trim()).filter(Boolean);
}

export async function load({ url }: any) {
  const selected = {
    documentTypes: getAll(url, "documentType"),
    collections: getAll(url, "collection"),
    vendorSources: getAll(url, "vendorSource"),
    titleSearch: url.searchParams.get("titleSearch")?.trim() ?? ""
  };

  return await archiveBrowserGet(selected);
}
