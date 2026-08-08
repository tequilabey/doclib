// src/lib/server/db.ts
import "dotenv/config";
import sql from "mssql";

let pool: any = null;

function getConfig(): any {
  const server = process.env.MSSQL_HOST?.trim();
  const database = process.env.MSSQL_DB?.trim();
  const portRaw = process.env.MSSQL_PORT?.trim();

  const user =
    process.env.MSSQL_USER?.trim() ||
    process.env.SQLSERVER_USER?.trim();

  const password =
    process.env.MSSQL_PASSWORD?.trim() ||
    process.env.SQLSERVER_PASSWORD?.trim();

  if (!server || !database) {
    throw new Error("Missing SQL config. Set MSSQL_HOST and MSSQL_DB.");
  }

  if (!user || !password) {
    throw new Error("Missing SQL credentials. Set MSSQL_USER/MSSQL_PASSWORD or SQLSERVER_USER/SQLSERVER_PASSWORD.");
  }

  return {
    server,
    port: portRaw ? Number(portRaw) : 1433,
    user,
    password,
    database,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };
}

export async function getPool(): Promise<any> {
  if (pool) return pool;

  pool = await sql.connect(getConfig());

  pool.on("error", () => {
    pool = null;
  });

  return pool;
}
