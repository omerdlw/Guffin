// Follow requests: who may create a follow, who may move it between
// pending / accepted / rejected, and the notifications each move leaves.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CHECK_VIOLATION,
  INSUFFICIENT_PRIVILEGE,
  setupTestDatabase,
} from "./harness.mjs";

const tx = setupTestDatabase();

const types = (rows) => rows.map((row) => row.type);

describe("creating a follow", () => {
  test("following a public account is accepted at once and notifies them", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser();

      await db.follow(me, them, "accepted");

      assert.equal(await db.followStatus(me, them), "accepted");
      assert.deepEqual(types(await db.notifications(them)), ["NEW_FOLLOWER"]);
    }));

  test("following a private account must start as a pending request", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });

      const error = await db
        .as(me)
        .then((d) =>
          d.fails(
            "insert into public.account_follows (follower_id, following_id, status) values ($1, $2, 'accepted')",
            [me, them],
          ),
        );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
      assert.equal(await db.followStatus(me, them), null);

      await db.follow(me, them, "pending");
      assert.equal(await db.followStatus(me, them), "pending");
      assert.deepEqual(types(await db.notifications(them)), ["FOLLOW_REQUEST"]);
    }));

  test("a public account can't be followed with a pending or rejected row", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser();

      await db.as(me);
      for (const status of ["pending", "rejected"]) {
        const error = await db.fails(
          "insert into public.account_follows (follower_id, following_id, status) values ($1, $2, $3)",
          [me, them, status],
        );
        assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
      }
    }));

  test("nobody can create a follow on someone else's behalf", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const victim = await db.createUser();
      const target = await db.createUser();

      await db.as(me);
      const error = await db.fails(
        "insert into public.account_follows (follower_id, following_id, status) values ($1, $2, 'accepted')",
        [victim, target],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
    }));

  test("a deactivated account can't be followed", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const gone = await db.createUser({ isActive: false });

      await db.as(me);
      for (const status of ["accepted", "pending"]) {
        const error = await db.fails(
          "insert into public.account_follows (follower_id, following_id, status) values ($1, $2, $3)",
          [me, gone, status],
        );
        assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
      }
    }));

  test("nobody can follow themselves", () =>
    tx(async (db) => {
      const me = await db.createUser();

      await db.as(me);
      const error = await db.fails(
        "insert into public.account_follows (follower_id, following_id, status) values ($1, $1, 'accepted')",
        [me],
      );
      assert.equal(error.code, CHECK_VIOLATION);
    }));
});

describe("answering a follow request", () => {
  test("the followed person accepts: request retired, requester told", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });
      await db.follow(me, them, "pending");

      await db.as(them);
      await db.rows(
        "update public.account_follows set status = 'accepted' where follower_id = $1 and following_id = $2",
        [me, them],
      );

      assert.equal(await db.followStatus(me, them), "accepted");
      assert.deepEqual(types(await db.notifications(them)), []);
      assert.deepEqual(types(await db.notifications(me)), ["FOLLOW_ACCEPTED"]);
      await db.asOwner();
      assert.ok(
        await db.value(
          "select responded_at is not null from public.account_follows where follower_id = $1",
          [me],
        ),
      );
    }));

  test("the followed person rejects: no access, notifications cleaned up", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });
      await db.follow(me, them, "pending");

      await db.as(them);
      await db.rows(
        "update public.account_follows set status = 'rejected' where follower_id = $1",
        [me],
      );

      assert.equal(await db.followStatus(me, them), "rejected");
      assert.deepEqual(types(await db.notifications(them)), []);
      assert.deepEqual(types(await db.notifications(me)), []);
    }));

  test("the followed person can't put a follow back to pending", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });
      await db.follow(me, them, "pending");
      await db.as(them);
      await db.rows(
        "update public.account_follows set status = 'accepted' where follower_id = $1",
        [me],
      );

      const error = await db.fails(
        "update public.account_follows set status = 'pending' where follower_id = $1",
        [me],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);
    }));

  test("the requester can't accept their own request", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });
      await db.follow(me, them, "pending");

      await db.as(me);
      const error = await db.fails(
        "update public.account_follows set status = 'accepted' where follower_id = $1",
        [me],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);

      // The upsert path used by followUserAction is held to the same rule.
      const upsert = await db.fails(
        `insert into public.account_follows (follower_id, following_id, status) values ($1, $2, 'pending')
         on conflict (follower_id, following_id) do update set status = 'accepted'`,
        [me, them],
      );
      assert.equal(upsert.code, INSUFFICIENT_PRIVILEGE);
      assert.equal(await db.followStatus(me, them), "pending");
    }));

  test("a third person can't see or answer someone else's request", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });
      const meddler = await db.createUser();
      await db.follow(me, them, "pending");

      await db.as(meddler);
      assert.deepEqual(
        await db.rows(
          "select 1 from public.account_follows where following_id = $1",
          [them],
        ),
        [],
      );
      await db.rows(
        "update public.account_follows set status = 'accepted' where following_id = $1",
        [them],
      );
      await db.rows(
        "delete from public.account_follows where following_id = $1",
        [them],
      );

      assert.equal(await db.followStatus(me, them), "pending");
    }));

  test("a follow can't be moved to other accounts", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser();
      const other = await db.createUser();
      await db.follow(me, them, "accepted");

      await db.as(me);
      const error = await db.fails(
        "update public.account_follows set following_id = $2 where follower_id = $1",
        [me, other],
      );
      assert.equal(error.code, INSUFFICIENT_PRIVILEGE);

      await db.as(them);
      const error2 = await db.fails(
        "update public.account_follows set follower_id = $2 where following_id = $1",
        [them, other],
      );
      assert.equal(error2.code, INSUFFICIENT_PRIVILEGE);
    }));

  test("re-following an account you already follow never downgrades it", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });
      await db.follow(me, them, "pending");
      await db.as(them);
      await db.rows(
        "update public.account_follows set status = 'accepted' where follower_id = $1",
        [me],
      );

      // followUserAction sends the status the target's privacy implies.
      await db.follow(me, them, "pending");

      assert.equal(await db.followStatus(me, them), "accepted");
      assert.deepEqual(types(await db.notifications(them)), []);
    }));
});

describe("privacy changes and unfollowing", () => {
  test("going public accepts every pending request", () =>
    tx(async (db) => {
      const owner = await db.createUser({ isPrivate: true });
      const a = await db.createUser();
      const b = await db.createUser();
      const c = await db.createUser();
      await db.follow(a, owner, "pending");
      await db.follow(b, owner, "pending");
      await db.follow(c, owner, "pending");
      await db.as(owner);
      await db.rows(
        "update public.account_follows set status = 'rejected' where follower_id = $1",
        [c],
      );

      await db.rows(
        "select * from public.update_account(p_is_private => false)",
      );

      assert.equal(await db.followStatus(a, owner), "accepted");
      assert.equal(await db.followStatus(b, owner), "accepted");
      assert.equal(
        await db.followStatus(c, owner),
        "rejected",
        "rejections stay rejected",
      );
      assert.deepEqual(types(await db.notifications(a)), ["FOLLOW_ACCEPTED"]);
      assert.deepEqual(types(await db.notifications(owner)), []);
    }));

  test("either side can end a follow, and its notifications go with it", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser();
      const other = await db.createUser();

      await db.follow(me, them, "accepted");
      await db.as(me);
      await db.rows(
        "delete from public.account_follows where following_id = $1",
        [them],
      );
      assert.equal(await db.followStatus(me, them), null);
      assert.deepEqual(types(await db.notifications(them)), []);

      await db.follow(other, them, "accepted");
      await db.as(them);
      await db.rows(
        "delete from public.account_follows where follower_id = $1",
        [other],
      );
      assert.equal(await db.followStatus(other, them), null);
    }));

  test("follow, unfollow, follow again leaves exactly one notification", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser();

      await db.follow(me, them, "accepted");
      await db.as(me);
      await db.rows(
        "delete from public.account_follows where following_id = $1",
        [them],
      );
      await db.follow(me, them, "accepted");

      assert.deepEqual(types(await db.notifications(them)), ["NEW_FOLLOWER"]);
    }));

  test("cancelling a request removes it from the owner's inbox", () =>
    tx(async (db) => {
      const me = await db.createUser();
      const them = await db.createUser({ isPrivate: true });
      await db.follow(me, them, "pending");

      await db.as(me);
      await db.rows(
        "delete from public.account_follows where following_id = $1",
        [them],
      );

      assert.deepEqual(types(await db.notifications(them)), []);
    }));
});
