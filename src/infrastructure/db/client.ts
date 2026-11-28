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

// Bound parameters force the extended protocol, one statement per round
// trip, so a scoped query costs three trips (scope, query, commit) — about
// 250ms against a remote database. Inlining the values as literals lets the
// whole transaction travel as one simple-protocol string: one trip. Values go
// through pg's own serializer and escapeLiteral, so the server sees exactly
// what it would have been bound. Anything that can't be written as a literal
// (bytea, dollar quoting) returns null and keeps the three-trip path.
// pg ships prepareValue at runtime; @types/pg doesn't declare it.
const { prepareValue } = (
  pg as unknown as {
    utils: { prepareValue: (value: unknown) => unknown };
  }
).utils;

function inline(text: string, values: readonly unknown[] = []): string | null {
  const literals: string[] = [];
  for (const value of values) {
    const prepared = prepareValue(value);
    if (prepared === null || prepared === undefined) literals.push("NULL");
    else if (typeof prepared === "string")
      literals.push(pg.escapeLiteral(prepared));
    else return null;
  }

  let out = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      out += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      out += char;
      continue;
    }
    if (char === "$" && text[i - 1] === "$") return null;
    if (char !== "$" || !/\d/.test(text[i + 1] ?? "")) {
      out += char;
      continue;
    }
    let end = i + 1;
    while (/\d/.test(text[end] ?? "")) end++;
    const literal = literals[Number(text.slice(i + 1, end)) - 1];
    if (literal === undefined) return null;
    out += literal;
    i = end - 1;
  }
  return quote ? null : out.replace(/[\s;]+$/, "");
}

async function inScope(
  viewerId: string | null,
  config: string | pg.QueryConfig,
  values?: unknown[],
): Promise<pg.QueryResult> {
  const scope = scopeStatement(viewerId);
  const query: pg.QueryConfig & { rowMode?: "array" } =
    typeof config === "string" ? { text: config } : config;
  const work = query.name
    ? null
    : inline(query.text, values ?? (query.values as unknown[] | undefined));
  const client = await getPool().connect();
  let broken = false;
  try {
    if (work !== null) {
      // begin, set_config, the query, commit → its result is the third.
      const results = (await client.query({
        rowMode: query.rowMode,
        text: `${scope}; ${work}; commit`,
        types: query.types,
      } as pg.QueryConfig)) as unknown as pg.QueryResult[];
      return results[2];
    }
    await client.query(scope);
    const result = await client.query(query, values);
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
    query: (config, values) => inScope(viewerId, config, values),
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
