// Who can see what: private profiles, deactivated accounts, and the
// tables a viewer must never be able to write to directly.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { INSUFFICIENT_PRIVILEGE, setupTestDatabase } from "./harness.mjs";

const tx = setupTestDatabase();

const LIBRARY_TABLES = [
  "account_watched",
  "account_diary",
  "account_likes",
  "account_watchlist",
  "account_stats",
];

/** Gives an account one row in each library table, as the account itself. */
async function fillLibrary(db, accountId) {
  await db.as(accountId);
  await db.rows(
    "insert into public.account_diary (account_id, tmdb_id, title) values ($1, 603, 'The Matrix')",
    [accountId],
  );
  await db.rows(
    "insert into public.account_likes (account_id, tmdb_id, title) values ($1, 603, 'The Matrix')",
    [accountId],
  );
  await db.rows(
    "insert into public.account_watchlist (account_id, tmdb_id, title) values ($1, 27205, 'Inception')",
    [accountId],
  );
}

/** Which library tables show at least one row of `ownerId` to `viewerId`. */
async function visibleTables(db, viewerId, ownerId) {
  await db.as(viewerId);
  const seen = [];
  for (const table of LIBRARY_TABLES) {
    const n = await db.value(
      `select count(*)::int from public.${table} where account_id = $1`,
      [ownerId],
    );
    if (n > 0) seen.push(table);
  }
  return seen;
}

describe("private profiles", () => {
  test("a private library is visible to its owner and accepted followers only", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const stranger = await db.createUser();
      const pending = await db.createUser();
      const accepted = await db.createUser();
      const rejected = await db.createUser();
      await fillLibrary(db, owner);

      await db.follow(pending, owner, "pending");
      await db.follow(accepted, owner, "pending");
      await db.follow(rejected, owner, "pending");
      await db.as(owner);
      await db.rows(
        "update public.account_follows set status = 'accepted' where follower_id = $1",
        [accepted],
      );
      await db.rows(
        "update public.account_follows set status = 'rejected' where follower_id = $1",
        [rejected],
      );

      assert.deepEqual(await visibleTables(db, owner, owner), LIBRARY_TABLES);
      assert.deepEqual(
        await visibleTables(db, accepted, owner),
        LIBRARY_TABLES,
      );
      assert.deepEqual(await visibleTables(db, stranger, owner), []);
      assert.deepEqual(await visibleTables(db, pending, owner), []);
      assert.deepEqual(await visibleTables(db, rejected, owner), []);
      assert.deepEqual(await visibleTables(db, null, owner), []);
    }));

  test("a public library is visible to everyone, signed in or not", () =>
    tx(async (db) => {
      const owner = await db.createUser();
      const stranger = await db.createUser();
      await fillLibrary(db, owner);

      assert.deepEqual(
        await visibleTables(db, stranger, owner),
        LIBRARY_TABLES,
      );
      assert.deepEqual(await visibleTables(db, null, owner), LIBRARY_TABLES);
    }));

  test("the profile row of a private account stays findable, its library does not", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const stranger = await db.createUser();

      await db.as(stranger);
      const row = await db.one(
        "select id, is_private from public.accounts where id = $1",
        [owner],
      );
      assert.equal(row.is_private, true);

      const header = await db.value("select public.get_account_header($1)", [
        owner,
      ]);
      assert.equal(
        header.library,
        null,
        "locked profile must not show library numbers",
      );
      assert.equal(header.follow_status, null);
    }));

  test("an accepted follower gets the library numbers in the header", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const fan = await db.createUser();
      await fillLibrary(db, owner);
      await db.follow(fan, owner, "pending");
      await db.as(owner);
      await db.rows(
        "update public.account_follows set status = 'accepted' where follower_id = $1",
        [fan],
      );

      await db.as(fan);
      const header = await db.value("select public.get_account_header($1)", [
        owner,
      ]);
      assert.equal(header.follow_status, "accepted");
      assert.equal(
        header.library.watched,
        1,
        "diary + like of the same film is one watched title",
      );
    }));

  test("a pending follower is still a stranger to the profile functions", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const hopeful = await db.createUser();
      await fillLibrary(db, owner);
      await db.follow(hopeful, owner, "pending");

      await db.as(hopeful);
      const header = await db.value("select public.get_account_header($1)", [
        owner,
      ]);
      assert.equal(header.follow_status, "pending");
      assert.equal(header.library, null);
      assert.equal(
        await db.value("select public.get_account_overview($1)", [owner]),
        null,
      );
      const error = await db.fails(
        "select * from public.get_account_follows($1, 'followers')",
        [owner],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
    }));

  test("follower and following lists of a private account are refused to strangers", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const stranger = await db.createUser();

      await db.as(stranger);
      for (const direction of ["followers", "following"]) {
        const error = await db.fails(
          "select * from public.get_account_follows($1, $2)",
          [owner, direction],
        );
        assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
      }
      await db.as(null);
      const error = await db.fails(
        "select * from public.get_account_follows($1, 'followers')",
        [owner],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
    }));

  test("a private account's follows don't leak through a public account's lists", () =>
    tx(async (db) => {
      const hidden = await db.createUser({ isPrivate: true });
      const open = await db.createUser();
      const stranger = await db.createUser();
      await db.follow(hidden, open, "accepted");

      await db.as(stranger);
      const followers = await db.rows(
        "select account_id from public.get_account_follows($1, 'followers')",
        [open],
      );
      assert.deepEqual(followers, []);
      const raw = await db.rows(
        "select 1 from public.account_follows where following_id = $1",
        [open],
      );
      assert.deepEqual(raw, []);
    }));

  test("going private locks out non-followers but keeps accepted followers", () =>
    tx(async (db) => {
      const owner = await db.createUser();
      const fan = await db.createUser();
      const stranger = await db.createUser();
      await fillLibrary(db, owner);
      await db.follow(fan, owner, "accepted");

      await db.as(owner);
      await db.rows(
        "select * from public.update_account(p_is_private => true)",
      );

      assert.deepEqual(await visibleTables(db, fan, owner), LIBRARY_TABLES);
      assert.deepEqual(await visibleTables(db, stranger, owner), []);
      assert.deepEqual(await visibleTables(db, null, owner), []);
    }));

  test("a deactivated account disappears for everyone but its owner", () =>
    tx(async (db) => {
      const owner = await db.createUser();
      const fan = await db.createUser();
      await fillLibrary(db, owner);
      await db.follow(fan, owner, "accepted");

      await db.as(owner);
      await db.rows("select public.deactivate_current_account()");

      await db.as(fan);
      assert.deepEqual(
        await db.rows("select 1 from public.accounts where id = $1", [owner]),
        [],
      );
      assert.equal(
        await db.value("select public.get_account_header($1)", [owner]),
        null,
      );
      assert.deepEqual(await visibleTables(db, fan, owner), []);

      await db.as(owner);
      assert.equal(
        (await db.rows("select 1 from public.accounts where id = $1", [owner]))
          .length,
        1,
      );
      assert.deepEqual(await visibleTables(db, owner, owner), LIBRARY_TABLES);
    }));

  test("notifications and emails are visible only to their own user", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const fan = await db.createUser();
      await db.follow(fan, owner, "pending");

      await db.as(owner);
      assert.equal(
        await db.value("select count(*)::int from public.notifications"),
        1,
      );
      assert.equal(
        await db.value("select count(*)::int from public.account_emails"),
        1,
      );

      await db.as(fan);
      assert.equal(
        await db.value(
          "select count(*)::int from public.notifications where user_id = $1",
          [owner],
        ),
        0,
      );
      assert.equal(
        await db.value(
          "select count(*)::int from public.account_emails where account_id = $1",
          [owner],
        ),
        0,
      );

      await db.as(null);
      assert.equal(
        await db.value("select count(*)::int from public.notifications"),
        0,
      );
      assert.equal(
        await db.value("select count(*)::int from public.account_emails"),
        0,
      );
    }));
});

describe("no direct writes around the rules", () => {
  test("a user can't flip privacy or edit profiles with a raw UPDATE", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const other = await db.createUser();

      await db.as(owner);
      await db.rows(
        "update public.accounts set is_private = false where id = $1",
        [owner],
      );
      await db.as(other);
      await db.rows("update public.accounts set bio = 'pwned' where id = $1", [
        owner,
      ]);

      await db.asOwner();
      const row = await db.one(
        "select is_private, bio from public.accounts where id = $1",
        [owner],
      );
      assert.equal(
        row.is_private,
        true,
        "privacy changes go through update_account only",
      );
      assert.equal(row.bio, null);
    }));

  test("a user can't write their own or anyone's counters", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const other = await db.createUser();

      await db.as(me);
      await db.rows(
        "update public.account_stats set followers_count = 9999 where account_id = $1",
        [me],
      );
      await db.rows("delete from public.account_stats where account_id = $1", [
        other,
      ]);

      assert.equal((await db.stats(me)).followers_count, 0);
      assert.ok(await db.stats(other));
    }));

  test("a user can't create notifications or write to someone else's library", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const victim = await db.createUser();

      await db.as(me);
      let error = await db.fails(
        "insert into public.notifications (user_id, actor_id, type) values ($1, $2, 'NEW_FOLLOWER')",
        [victim, me],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);

      error = await db.fails(
        "insert into public.account_watched (account_id, tmdb_id, title) values ($1, 603, 'The Matrix')",
        [victim],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
    }));

  test("signed-out visitors can't write anything", () =>
    tx(async (db) => {
      const target = await db.createUser();

      await db.as(null);
      const error = await db.fails(
        "insert into public.account_follows (follower_id, following_id, status) values ($1, $1, 'accepted')",
        [target],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
      await db.rows(
        "update public.accounts set is_private = true where id = $1",
        [target],
      );
      await db.asOwner();
      assert.equal(
        await db.value("select is_private from public.accounts where id = $1", [
          target,
        ]),
        false,
      );
    }));
});
