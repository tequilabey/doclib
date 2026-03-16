// src/lib/server/db.ts
import "dotenv/config";
import sql from "mssql";

// Minimal, reliable pool singleton for SvelteKit SSR.
let pool: sql.ConnectionPool | null = null;

function getConfig(): sql.config {
  // Prefer volhrs-style MSSQL_* vars
  const server = process.env.MSSQL_HOST?.trim();
  const database = process.env.MSSQL_DB?.trim();
  const portRaw = process.env.MSSQL_PORT?.trim();
  const user = process.env.MSSQL_USER?.trim();
  const password = process.env.MSSQL_PASSWORD?.trim();

  if (!server || !database) {
    throw new Error(
      "Missing SQL config. Set MSSQL_HOST + MSSQL_DB (and MSSQL_PORT optional) plus SQLSERVER_USER/SQLSERVER_PASSWORD (or MSSQL_USER/MSSQL_PASSWORD)."
    );
  }

  // If you keep username/password in SQLSERVER_USER/SQLSERVER_PASSWORD (like your .env currently does), that's fine.
  if (!user || !password) {
    throw new Error("Missing SQL credentials. Set SQLSERVER_USER + SQLSERVER_PASSWORD (or MSSQL_USER + MSSQL_PASSWORD).");
  }

  return {
    server,
    port: portRaw ? Number(portRaw) : 1433,
    user,
    password,
    database,
    options: {
      encrypt: false,              // local docker on same host; keep it simple
      trustServerCertificate: true // avoids TLS/SNI weirdness
    }
  };
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;

  const config = getConfig();
  pool = await sql.connect(config);

  // If pool errors later, drop it so we can reconnect on next request
  pool.on("error", () => {
    pool = null;
  });

  return pool;
}
