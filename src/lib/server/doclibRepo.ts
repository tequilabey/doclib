import sql from "mssql";
import { getPool } from "$lib/server/db"; // adjust if needed

export type DoclibNode = {
  NodeId: number;
  ParentNodeId: number | null;
  NodeType: string;
  FriendlyName: string;
  GoogleFileId: string | null;
  ExternalUrl: string | null;
  OpenMode: string | null;
  SortOrder: number;
};

export async function nodeGetRoots(includeUnpublished = false): Promise<DoclibNode[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("IncludeUnpublished", sql.Bit, includeUnpublished ? 1 : 0)
    .execute("doclib.Node_GetRoots");

  return (r.recordset ?? []) as DoclibNode[];
}

export async function nodeGetChildren(parentNodeId: number, includeUnpublished = false): Promise<DoclibNode[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("ParentNodeId", sql.Int, parentNodeId)
    .input("IncludeUnpublished", sql.Bit, includeUnpublished ? 1 : 0)
    .execute("doclib.Node_GetChildren");

  return (r.recordset ?? []) as DoclibNode[];
}

// Navstate helpers (from earlier)
export type UserNavStateRow = {
  UserId: number;
  StateKey: string;
  StateJson: string;
  UpdatedUtc: string;
};

export async function userNavStateGet(userId: number, stateKey: string) {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("UserId", sql.Int, userId)
    .input("StateKey", sql.VarChar(50), stateKey)
    .execute("doclib.UserNavState_Get");
  return (r.recordset?.[0] as UserNavStateRow | undefined) ?? null;
}

export async function userNavStateUpsert(userId: number, stateKey: string, stateJson: string) {
  const pool = await getPool();
  await pool
    .request()
    .input("UserId", sql.Int, userId)
    .input("StateKey", sql.VarChar(50), stateKey)
    .input("StateJson", sql.NVarChar(sql.MAX), stateJson)
    .execute("doclib.UserNavState_Upsert");
}
