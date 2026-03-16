// src/routes/api/doclib/children/+server.ts
import { json, error } from "@sveltejs/kit";
import { nodeGetChildren } from "$lib/server/doclibRepo";

function requireUser(locals: any) {
  if (!locals?.user?.UserId) throw error(401, "Not logged in");
}
function hasRole(user: any, role: string) {
  const roles: string[] = user?.Roles ?? [];
  return roles.includes(role) || roles.includes("admin");
}

export async function GET({ locals, url }: any) {
  //requireUser(locals);
  //if (!hasRole(locals.user, "doclib")) throw error(403, "Missing role: doclib");

  const parentIdRaw = url.searchParams.get("parentId");
  const parentId = Number(parentIdRaw);
  if (!Number.isInteger(parentId) || parentId <= 0) throw error(400, "Invalid parentId");

  const children = await nodeGetChildren(parentId, false);
  return json({ parentId, children });
}
