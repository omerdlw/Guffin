import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

try {
  process.loadEnvFile(".env.local");
} catch {}

const enabled = Boolean(process.env.DATABASE_URL);

describe.runIf(enabled)("database sessions", async () => {
  const { admin, asViewer, viewer } = await import("./client");
  const { accounts, authUsers, accountFollows } = await import("./schema");
  const alice = crypto.randomUUID();
  const bob = crypto.randomUUID();

  beforeAll(async () => {
    await admin().db.insert(authUsers).values([
      { email: `${alice}@client.test`, id: alice, name: "Alice" },
      { email: `${bob}@client.test`, id: bob, name: "Bob" },
    ]);
    await admin().db.update(accounts).set({ isPrivate: true }).where(eq(accounts.id, bob));
  });

  afterAll(async () => {
    await admin().db.delete(authUsers).where(sql`${authUsers.id} in (${alice}, ${bob})`);
  });

  it("creates the profile side of a new auth user", async () => {
    const [row] = await admin()
      .db.select({ displayName: accounts.displayName })
      .from(accounts)
      .where(eq(accounts.id, alice));
    expect(row?.displayName).toBe("Alice");
  });

  it("runs guests as anon and members as themselves", async () => {
    const [guest] = (await viewer(null).db.execute(
      sql`select current_user as role, private.viewer_id() as id`,
    )).rows;
    expect(guest).toEqual({ id: null, role: "anon" });

    const [member] = (await viewer(alice).db.execute(
      sql`select current_user as role, private.viewer_id() as id`,
    )).rows;
    expect(member).toEqual({ id: alice, role: "authenticated" });
  });

  it("enforces row level security for the viewer", async () => {
    const asBob = await viewer(alice)
      .db.select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, bob));
    expect(asBob).toHaveLength(1);

    await expect(
      viewer(alice).db.insert(accountFollows).values({ followerId: bob, followingId: alice }),
    ).rejects.toThrow();

    await viewer(alice).db.insert(accountFollows).values({ followerId: alice, followingId: bob });
    const [follow] = await admin()
      .db.select({ status: accountFollows.status })
      .from(accountFollows)
      .where(eq(accountFollows.followerId, alice));
    expect(follow?.status).toBe("pending");
  });

  it("never leaks the viewer into a pooled connection", async () => {
    await viewer(alice).db.execute(sql`select 1`);
    const [row] = (await admin().db.execute(
      sql`select current_user as role, private.viewer_id() as id`,
    )).rows;
    expect(row?.id).toBeNull();
    expect(row?.role).not.toBe("authenticated");
  });

  it("calls functions with named arguments and typed results", async () => {
    const counts = await viewer(alice).call("get_account_follow_counts", {
      p_account_id: alice,
    });
    expect(counts).toEqual([{ followers_count: 0, following_count: 0 }]);

    const rolledBack = asViewer(alice, async (session) => {
      await session.db.insert(accountFollows).values({ followerId: alice, followingId: alice });
    });
    await expect(rolledBack).rejects.toThrow();
  });

  it("returns timestamps in ISO form with full precision", async () => {
    const [row] = await admin()
      .db.select({ createdAt: accounts.createdAt })
      .from(accounts)
      .where(eq(accounts.id, alice));
    expect(row?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?[+-]\d{2}:\d{2}$/);
  });
});
