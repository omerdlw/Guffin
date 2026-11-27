// Test harness for the database rules (RLS policies and triggers).
//
// It never touches the database you point it at. Given TEST_DATABASE_URL, it
// creates a throwaway database next to it, applies every migration in
// scripts/db/migrations in journal order, and drops it again at the end.
// Every test runs inside one transaction that is always rolled back, so tests
// can't leak rows into each other.
//
// Viewers are simulated exactly as src/infrastructure/db/client.ts does it:
// set_config('role', 'authenticated' | 'anon', true) plus app.viewer_id.

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, before } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

const MIGRATIONS = new URL("../../scripts/db/migrations/", import.meta.url);

function requireTestUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Point it at a local Postgres or a Neon " +
        "branch (never production). The tests create and drop their own " +
        "database on that server and leave the named database untouched.",
    );
  }
  return url;
}

function withDatabase(url, name) {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.toString();
}

async function applyMigrations(client) {
  const journal = JSON.parse(
    await readFile(new URL("meta/_journal.json", MIGRATIONS), "utf8"),
  );
  for (const entry of journal.entries) {
    const sql = await readFile(new URL(`${entry.tag}.sql`, MIGRATIONS), "utf8");
    await client.query("begin");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.query(statement);
    }
    await client.query("commit");
  }
}

/**
 * Registers before/after hooks that create a fresh, migrated database for
 * this test file. Returns `tx(work)`, which runs `work(db)` inside a
 * transaction that is rolled back afterwards.
 */
export function setupTestDatabase() {
  const baseUrl = requireTestUrl();
  const name = `guffin_test_${process.pid}_${Date.now()}`;
  let admin;
  let pool;

  before(async () => {
    admin = new pg.Client({ connectionString: baseUrl });
    await admin.connect();
    await admin.query(`create database "${name}"`);

    pool = new pg.Pool({
      connectionString: withDatabase(baseUrl, name),
      max: 2,
    });
    const client = await pool.connect();
    try {
      await applyMigrations(client);
    } finally {
      client.release();
    }
  });

  after(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`drop database if exists "${name}" with (force)`);
      await admin.end();
    }
  });

  return async function tx(work) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await work(new Db(client));
    } finally {
      await client.query("rollback").catch(() => {});
      client.release();
    }
  };
}

let savepoints = 0;

class Db {
  constructor(client) {
    this.client = client;
  }

  /** Run as the pool owner (no RLS), like admin() in the app. */
  async asOwner() {
    await this.client.query(
      "reset role; select set_config('app.viewer_id', '', true)",
    );
    return this;
  }

  /** Run as a signed-in viewer, or as a signed-out visitor when id is null. */
  async as(viewerId) {
    await this.asOwner();
    if (viewerId === null) {
      await this.client.query("select set_config('role', 'anon', true)");
    } else {
      await this.client.query(
        "select set_config('role', 'authenticated', true), set_config('app.viewer_id', $1, true)",
        [viewerId],
      );
    }
    return this;
  }

  async rows(sql, params = []) {
    return (await this.client.query(sql, params)).rows;
  }

  async one(sql, params = []) {
    const rows = await this.rows(sql, params);
    assert.equal(rows.length, 1, `expected one row from: ${sql}`);
    return rows[0];
  }

  async value(sql, params = []) {
    const row = await this.one(sql, params);
    return Object.values(row)[0];
  }

  /** Expects the statement to fail; returns the Postgres error. */
  async fails(sql, params = []) {
    const sp = `sp_${++savepoints}`;
    await this.client.query(`savepoint ${sp}`);
    try {
      await this.client.query(sql, params);
    } catch (error) {
      await this.client.query(`rollback to savepoint ${sp}`);
      return error;
    }
    await this.client.query(`release savepoint ${sp}`);
    assert.fail(`expected this statement to fail: ${sql}`);
  }

  /**
   * Creates an auth user the way Better Auth does (one auth_users row; the
   * trigger makes the account, stats and email rows), then sets the profile.
   * Leaves the session running as the owner.
   */
  async createUser({ username, isPrivate = false, isActive = true } = {}) {
    await this.asOwner();
    const id = randomUUID();
    const handle = username ?? `user${id.slice(0, 8)}`;
    await this.client.query(
      "insert into public.auth_users (id, name, email, email_verified) values ($1, $2, $3, true)",
      [id, handle, `${handle}@example.test`],
    );
    await this.client.query(
      "update public.accounts set username = $2, is_private = $3, is_active = $4 where id = $1",
      [id, handle, isPrivate, isActive],
    );
    return id;
  }

  /** The stored counters for an account, read as the owner. */
  async stats(accountId) {
    await this.asOwner();
    return this.one(
      `select followers_count, following_count, watched_count, watchlist_count,
              likes_count, diary_count
       from public.account_stats where account_id = $1`,
      [accountId],
    );
  }

  /** Counters recomputed from the rows themselves, read as the owner. */
  async trueStats(accountId) {
    await this.asOwner();
    return this.one(
      `select
         (select count(*)::int from public.account_follows where following_id = $1 and status = 'accepted') as followers_count,
         (select count(*)::int from public.account_follows where follower_id = $1 and status = 'accepted') as following_count,
         (select count(*)::int from public.account_watched where account_id = $1) as watched_count,
         (select count(*)::int from public.account_watchlist where account_id = $1) as watchlist_count,
         (select count(*)::int from public.account_likes where account_id = $1) as likes_count,
         (select count(*)::int from public.account_diary where account_id = $1) as diary_count`,
      [accountId],
    );
  }

  /** Follows the way followUserAction does: an upsert with the implied status. */
  async follow(followerId, targetId, status) {
    await this.as(followerId);
    await this.client.query(
      `insert into public.account_follows (follower_id, following_id, status)
       values ($1, $2, $3)
       on conflict (follower_id, following_id) do update set status = excluded.status`,
      [followerId, targetId, status],
    );
  }

  async followStatus(followerId, targetId) {
    await this.asOwner();
    const rows = await this.rows(
      "select status from public.account_follows where follower_id = $1 and following_id = $2",
      [followerId, targetId],
    );
    return rows[0]?.status ?? null;
  }

  /** Notification types a user has, read as the owner. */
  async notifications(userId) {
    await this.asOwner();
    const rows = await this.rows(
      "select type, actor_id from public.notifications where user_id = $1 order by type",
      [userId],
    );
    return rows;
  }
}

export const INSUFFICIENT_PRIVILEGE = "42501";
export const CHECK_VIOLATION = "23514";
