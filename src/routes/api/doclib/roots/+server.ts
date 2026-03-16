// src/routes/api/doclib/roots/+server.ts
import { json, error } from "@sveltejs/kit";
import { nodeGetRoots } from "$lib/server/doclibRepo";

function requireUser(locals: any) {
  if (!locals?.user?.UserId) throw error(401, "Not logged in");
}
function hasRole(user: any, role: string) {
  const roles: string[] = user?.Roles ?? [];
  return roles.includes(role) || roles.includes("admin");
}

export async function GET({ locals }: any) {
  //requireUser(locals);
  //if (!hasRole(locals.user, "doclib")) throw error(403, "Missing role: doclib");

  const roots = await nodeGetRoots(false);
  return json({ roots });
}
