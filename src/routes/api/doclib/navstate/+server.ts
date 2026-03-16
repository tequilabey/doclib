import { json, error } from "@sveltejs/kit";
import { userNavStateGet, userNavStateUpsert } from "$lib/server/doclibRepo";

const DEFAULT_STATE = {
  expandedIds: [] as number[],
  selectedId: null as number | null
};

function hasRole(user: any, role: string) {
  const roles: string[] = user?.Roles ?? [];
  return roles.includes(role) || roles.includes("admin");
}

function getUserId(locals: any) {
  // DEV fallback until auth is wired:
  const fallback = Number(process.env.VOLHRS_USER_ID ?? 1);
  const uid = locals?.user?.UserId ?? fallback;
  if (!Number.isInteger(uid) || uid <= 0) throw error(500, "Invalid user context");
  return uid;
}

export async function GET({ locals, url }: any) {
  // When auth is wired, re-enable:
  // if (!locals?.user?.UserId) throw error(401, "Not logged in");
  // if (!hasRole(locals.user, "doclib")) throw error(403, "Missing role: doclib");

  const userId = getUserId(locals);

  const stateKey = (url.searchParams.get("key") ?? "doclib-tree").trim();
  if (!stateKey) throw error(400, "Missing key");

  const row = await userNavStateGet(userId, stateKey);
  if (!row) return json({ stateKey, state: DEFAULT_STATE });

  try {
    return json({ stateKey, state: JSON.parse(row.StateJson) });
  } catch {
    return json({ stateKey, state: DEFAULT_STATE });
  }
}

export async function PUT({ locals, url, request }: any) {
  // When auth is wired, re-enable:
  // if (!locals?.user?.UserId) throw error(401, "Not logged in");
  // if (!hasRole(locals.user, "doclib")) throw error(403, "Missing role: doclib");

  const userId = getUserId(locals);

  const stateKey = (url.searchParams.get("key") ?? "doclib-tree").trim();
  if (!stateKey) throw error(400, "Missing key");

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw error(400, "Invalid JSON body");

  const expandedIds = Array.isArray((body as any).expandedIds)
    ? (body as any).expandedIds
        .filter((x: any) => Number.isInteger(x))
        .map((x: any) => Number(x))
    : [];

  const selectedIdRaw = (body as any).selectedId;
  const selectedId =
    selectedIdRaw === null || Number.isInteger(selectedIdRaw) ? selectedIdRaw : null;

  const stateToSave = { expandedIds, selectedId };
  await userNavStateUpsert(userId, stateKey, JSON.stringify(stateToSave));

  return json({ ok: true });
}
