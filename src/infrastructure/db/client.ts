import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { requireDatabaseUrl } from "@/infrastructure/config";
import { toIsoTimestamp } from "./columns";
import { DB_FUNCTIONS, type DbFunctions } from "./functions";
import * as schema from "./schema";

pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, toIsoTimestamp);
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number.parseFloat);
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

export type Database = NodePgDatabase<typeof schema>;

interface Queryable {
  query: (
    config: string | pg.QueryConfig,
    values?: unknown[],
  ) => Promise<pg.QueryResult>;
}

export interface Session {
  db: Database;
  call: <N extends keyof DbFunctions>(
    name: N,
    args?: DbFunctions[N]["args"],
  ) => Promise<DbFunctions[N]["returns"]>;
}

const globalPool = globalThis as typeof globalThis & { guffinPool?: pg.Pool };

// Without these a dropped network (sleep, Wi-Fi change, EHOSTUNREACH) leaves
// pooled sockets half-open: connect() and queries then wait forever and the
// route never leaves its loading skeleton. Bounded waits turn that into an
// error the page can render, and a broken client is discarded, not reused.
const CONNECT_TIMEOUT_MS = 10_000;
const QUERY_TIMEOUT_MS = 15_000;

function getPool(): pg.Pool {
  if (!globalPool.guffinPool) {
    const pool = new pg.Pool({
      connectionString: requireDatabaseUrl(),
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      max: 10,
      query_timeout: QUERY_TIMEOUT_MS,
    });
    // An idle client's socket error is otherwise an uncaughtException; the
    // pool already drops that client.
    pool.on("error", (error) => {
      console.warn("[db] idle client error:", error.message);
    });
    globalPool.guffinPool = pool;
  }
  return globalPool.guffinPool;
}

function bind(client: Queryable): Session {
  return {
    call: (name, args) => callFunction(client, name, args),
    db: drizzle({ client: client as pg.Pool, schema }),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PIN = "set_config('search_path', 'public', true)";

function scopeStatement(viewerId: string | null): string {
  if (viewerId === null)
    return `begin; select ${PIN}, set_config('role', 'anon', true)`;
  if (!UUID.test(viewerId)) throw new Error("Invalid viewer id");
  return `begin; select ${PIN}, set_config('role', 'authenticated', true), set_config('app.viewer_id', '${viewerId}', true)`;
}

async function inScope<T>(
  viewerId: string | null,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const scope = scopeStatement(viewerId);
  const client = await getPool().connect();
  let broken = false;
  try {
    await client.query(scope);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {
      broken = true;
    });
    throw error;
  } finally {
    client.release(broken);
  }
}

async function callFunction<N extends keyof DbFunctions>(
  client: Queryable,
  name: N,
  args?: DbFunctions[N]["args"],
): Promise<DbFunctions[N]["returns"]> {
  const shape = DB_FUNCTIONS[name];
  const given = (args ?? {}) as Record<string, unknown>;
  const values: unknown[] = [];
  const params = shape.args.flatMap(([arg, type]) => {
    if (given[arg] === undefined) return [];
    const value = given[arg];
    values.push(
      type === "jsonb" && value !== null ? JSON.stringify(value) : value,
    );
    return [`${arg} => $${values.length}::${type}`];
  });
  const target = `public.${name}(${params.join(", ")})`;
  const text =
    shape.kind === "scalar"
      ? `select ${target} as value`
      : `select * from ${target}`;
  const { rows } = await client.query(text, values);

  if (shape.kind === "scalar") {
    return (rows[0]?.value ?? null) as DbFunctions[N]["returns"];
  }
  return rows as DbFunctions[N]["returns"];
}

let adminSession: Session | null = null;

export function admin(): Session {
  adminSession ??= bind(getPool());
  return adminSession;
}

export function viewer(viewerId: string | null): Session {
  scopeStatement(viewerId);
  return bind({
    query: (config, values) =>
      inScope(viewerId, (client) => client.query(config, values)),
  });
}

export function pgError(error: unknown): pg.DatabaseError | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    if (current instanceof pg.DatabaseError) return current;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

export function pgErrorCode(error: unknown): string | null {
  return pgError(error)?.code ?? null;
}
