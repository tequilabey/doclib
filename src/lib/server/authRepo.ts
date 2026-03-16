// src/lib/server/authRepo.ts
import sql from "mssql";
import { getPool } from "$lib/server/db";
//import { sessionsGetUserByToken, sessionsTouch } from "$lib/server/authRepo";

/**
 * Reads the active session by token and returns the user + roles payload
 * expected by hooks.server.ts.
 *
 * Adjust the sproc name if yours differs.
 */
export async function sessionsGetUserByToken(token: string): Promise<{
  UserId: number;
  LoginName: string;
  FirstName?: string | null;
  LastName?: string | null;
  Roles?: any[];
  sessionId: number;
} | null> {
  const pool = await getPool();

  const r = await pool
    .request()
    .input("Token", sql.VarChar(200), token)
    .execute("el20.Sessions_GetUserByTokenHash"); // <-- if yours is different, change here

  const row = r.recordset?.[0];
  if (!row) return null;

  // Expecting columns like:
  // UserId, LoginName, FirstName, LastName, sessionId, RolesJson (or Roles)
  let roles: any[] = [];

  if (row.RolesJson) {
    try {
      roles = JSON.parse(row.RolesJson);
    } catch {
      roles = [];
    }
  } else if (row.Roles) {
    // sometimes sprocs return Roles already as array-ish
    roles = row.Roles;
  }

  return {
    UserId: row.UserId,
    LoginName: row.LoginName,
    FirstName: row.FirstName ?? null,
    LastName: row.LastName ?? null,
    sessionId: row.sessionId ?? row.SessionId ?? row.SessId,
    Roles: roles
  };
}

/**
 * Touch session expiry (rolling session).
 * Adjust sproc name/param names if yours differs.
 */
export async function sessionsTouch(args: { sessionId: number; newExpiresAtUtc: Date }): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input("SessionId", sql.Int, args.sessionId)
    .input("NewExpiresAtUtc", sql.DateTime2, args.newExpiresAtUtc)
    .execute("el20.Sessions_Touch"); // <-- if yours is different, change here
}
