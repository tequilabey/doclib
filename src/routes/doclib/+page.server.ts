// src/routes/doclib/+page.server.ts
import { redirect } from "@sveltejs/kit";

function hasRole(user: any, role: string) {
  const roles: string[] = user?.Roles ?? [];
  return roles.includes(role) || roles.includes("admin");
}

export async function load({ locals }: any) {
  //if (!locals.user) throw redirect(303, "/login");
  //if (!hasRole(locals.user, "doclib")) throw redirect(303, "/");

  return {};
}
