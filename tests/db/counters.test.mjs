// account_stats is maintained by triggers (+1 / -1) and never recomputed on
// read. These tests check that the stored numbers always equal a fresh
// count of the rows they summarise.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { setupTestDatabase } from "./harness.mjs";

const tx = setupTestDatabase();

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

const FOLLOW_KEYS = ["followers_count", "following_count"];

async function assertInSync(db, accountId, label = "") {
  assert.deepEqual(
    await db.stats(accountId),
    await db.trueStats(accountId),
    `account_stats drifted ${label}`.trim(),
  );
}

describe("follow counters", () => {
  test("only accepted follows count, through every transition", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });

      await db.follow(me, them, "pending");
      assert.equal(
        (await db.stats(them)).followers_count,
        0,
        "pending doesn't count",
      );
      assert.equal((await db.stats(me)).following_count, 0);

      await db.as(them);
      await db.rows(
        "update public.account_follows set status = 'accepted' where follower_id = $1",
        [me],
      );
      assert.equal((await db.stats(them)).followers_count, 1);
      assert.equal((await db.stats(me)).following_count, 1);

      await db.as(me);
      await db.rows(
        "delete from public.account_follows where following_id = $1",
        [them],
      );
      assert.equal((await db.stats(them)).followers_count, 0);
      assert.equal((await db.stats(me)).following_count, 0);

      await db.follow(me, them, "pending");
      await db.as(them);
      await db.rows(
        "update public.account_follows set status = 'rejected' where follower_id = $1",
        [me],
      );
      assert.equal(
        (await db.stats(them)).followers_count,
        0,
        "rejected doesn't count",
      );

      await assertInSync(db, me);
      await assertInSync(db, them);
    }));

  test("going public counts the auto-accepted requests", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const fans = [];
      for (let i = 0; i < 4; i++) {
        const fan = await db.createUser();
        await db.follow(fan, owner, "pending");
        fans.push(fan);
      }

      await db.as(owner);
      await db.rows(
        "select * from public.update_account(p_is_private => false)",
      );

      assert.equal((await db.stats(owner)).followers_count, 4);
      for (const fan of fans) await assertInSync(db, fan);
      await assertInSync(db, owner);
    }));

  test("deleting a user takes their follows out of everyone else's counts", () =>
    tx(async (db) => {
      const leaver = await db.createUser();
      const a = await db.createUser();
      const b = await db.createUser();
      await db.follow(leaver, a, "accepted");
      await db.follow(b, leaver, "accepted");

      await db.asOwner();
      await db.rows("delete from public.auth_users where id = $1", [leaver]);

      assert.deepEqual(pick(await db.stats(a), FOLLOW_KEYS), {
        followers_count: 0,
        following_count: 0,
      });
      assert.deepEqual(pick(await db.stats(b), FOLLOW_KEYS), {
        followers_count: 0,
        following_count: 0,
      });
    }));

  test("a random mix of follow actions never lets the counters drift", () =>
    tx(async (db) => {
      // Small deterministic PRNG so a failure is reproducible.
      let seed = 0x9e3779b9;
      const random = (n) => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed % n;
      };

      const users = [];
      for (let i = 0; i < 6; i++) {
        users.push({
          id: await db.createUser({ isPrivate: i % 2 === 0 }),
          isPrivate: i % 2 === 0,
        });
      }

      for (let step = 0; step < 150; step++) {
        const a = users[random(users.length)];
        const b = users[random(users.length)];
        if (a === b) continue;
        const action = random(5);
        const status = await db.followStatus(a.id, b.id);

        if (action === 0 || action === 1) {
          // follow (or re-follow) with the implied status
          if (status === "rejected") continue;
          await db.follow(a.id, b.id, b.isPrivate ? "pending" : "accepted");
        } else if (action === 2 && status === "pending") {
          await db.as(b.id);
          const answer = random(2) ? "accepted" : "rejected";
          await db.rows(
            "update public.account_follows set status = $3 where follower_id = $1 and following_id = $2",
            [a.id, b.id, answer],
          );
        } else if (action === 3 && status !== null) {
          // unfollow, or the other side removes the follower
          await db.as(random(2) ? a.id : b.id);
          await db.rows(
            "delete from public.account_follows where follower_id = $1 and following_id = $2",
            [a.id, b.id],
          );
        } else if (action === 4) {
          b.isPrivate = !b.isPrivate;
          await db.as(b.id);
          await db.rows(
            "select * from public.update_account(p_is_private => $1)",
            [b.isPrivate],
          );
        }
      }

      for (const user of users)
        await assertInSync(db, user.id, `for ${user.id}`);
    }));
});

describe("library counters", () => {
  test("diary, watched, likes and watchlist counts follow their rows", () =>
    tx(async (db) => {
      const me = await db.createUser();
      await db.as(me);

      await db.rows(
        "insert into public.account_watchlist (account_id, tmdb_id, title) values ($1, 603, 'The Matrix'), ($1, 27205, 'Inception')",
        [me],
      );
      // Logging a watchlisted film: +1 diary, +1 watched, -1 watchlist.
      await db.as(me);
      await db.rows(
        "insert into public.account_diary (account_id, tmdb_id, title) values ($1, 603, 'The Matrix')",
        [me],
      );
      // A rewatch is another diary entry but not another watched title.
      await db.as(me);
      await db.rows(
        "insert into public.account_diary (account_id, tmdb_id, title) values ($1, 603, 'The Matrix')",
        [me],
      );
      await db.as(me);
      await db.rows(
        "insert into public.account_likes (account_id, tmdb_id, title) values ($1, 157336, 'Interstellar')",
        [me],
      );

      assert.deepEqual(await db.stats(me), {
        followers_count: 0,
        following_count: 0,
        watched_count: 2,
        watchlist_count: 1,
        likes_count: 1,
        diary_count: 2,
      });
      await assertInSync(db, me);

      await db.as(me);
      await db.rows("delete from public.account_likes where account_id = $1", [
        me,
      ]);
      await db.as(me);
      await db.rows("delete from public.account_diary where account_id = $1", [
        me,
      ]);
      await assertInSync(db, me, "after deletes");
    }));

  test("refresh_account_stats agrees with the trigger-maintained numbers", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser();
      await db.follow(me, them, "accepted");
      await db.as(me);
      await db.rows(
        "insert into public.account_diary (account_id, tmdb_id, title) values ($1, 603, 'The Matrix')",
        [me],
      );

      const before = await db.stats(me);
      await db.asOwner();
      await db.rows("select public.refresh_account_stats($1)", [me]);
      assert.deepEqual(await db.stats(me), before);
    }));
});
