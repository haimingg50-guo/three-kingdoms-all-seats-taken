import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { Pool, type PoolClient } from "pg";

export interface Sql {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<number>;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  owner_hash TEXT,
  state_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS events (
  world_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  body_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (world_id, seq)
)`,
  `CREATE TABLE IF NOT EXISTS seats (
  world_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  PRIMARY KEY (world_id, role_id)
)`,
  `CREATE TABLE IF NOT EXISTS bans (
  world_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (world_id, token_hash)
)`,
  `CREATE TABLE IF NOT EXISTS referees (
  world_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL
)`,
];

const SCHEMA = SCHEMA_STATEMENTS.join(";\n");

function toPg(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

function sqliteArgs(params: unknown[]): SQLInputValue[] {
  return params as SQLInputValue[];
}

class SqliteSql implements Sql {
  constructor(private db: DatabaseSync) {}
  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...sqliteArgs(params)) as T[];
  }
  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...sqliteArgs(params)) as T | undefined;
  }
  async run(sql: string, params: unknown[] = []): Promise<number> {
    const result = this.db.prepare(sql).run(...sqliteArgs(params)) as { changes?: number | bigint };
    return Number(result.changes ?? 0);
  }
}

class PgSql implements Sql {
  constructor(private client: Pool | PoolClient) {}
  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(toPg(sql), params);
    return result.rows as T[];
  }
  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }
  async run(sql: string, params: unknown[] = []): Promise<number> {
    const result = await this.client.query(toPg(sql), params);
    return result.rowCount ?? 0;
  }
}

interface Database {
  sql: Sql;
  tx<T>(fn: (q: Sql) => Promise<T>): Promise<T>;
}

let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function open(): Database {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) {
    const pool = new Pool({ connectionString: url, max: 4 });
    const sql = new PgSql(pool);
    return {
      sql,
      tx: (fn) =>
        enqueue(async () => {
          const client = await pool.connect();
          const q = new PgSql(client);
          try {
            await client.query("BEGIN");
            const value = await fn(q);
            await client.query("COMMIT");
            return value;
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
        }),
    };
  }
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "tianxia.sqlite");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);
  const sql = new SqliteSql(db);
  return {
    sql,
    tx: (fn) =>
      enqueue(async () => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const value = await fn(sql);
          db.exec("COMMIT");
          return value;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }),
  };
}

const globalDb = globalThis as typeof globalThis & { __tianxiaDb?: Database };

export function database(): Database {
  if (!globalDb.__tianxiaDb) globalDb.__tianxiaDb = open();
  return globalDb.__tianxiaDb;
}

export async function ensureSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.startsWith("postgres")) return;
  const db = database();
  for (const statement of SCHEMA_STATEMENTS) {
    await db.sql.run(statement);
  }
}
