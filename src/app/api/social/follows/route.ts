import { UserError } from "@omerdlw/base-framework/utils";
import { and, count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getOptionalUser, requireUser } from "@/features/auth/server";
import { pgErrorCode, viewer } from "@/lib/db/client";
import { accountFollows, accounts } from "@/lib/db/schema";
import { isUuid } from "@/lib/http";
import {
  apiErrorResponse,
  assertSameOrigin,
  rateLimitResponse,
} from "@/lib/security";

const FOLLOW_PAGE_SIZE = 50;
const REQUESTS_LIMIT = 100;

function cursorTime(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

interface ProfileRow {
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
}

function toSocialUser(
  id: string,
  profile: ProfileRow | null | undefined,
  createdAt: string,
) {
  return {
    avatarUrl: profile?.avatar_url || null,
    createdAt,
    displayName: profile?.display_name || profile?.username || "Anonymous User",
    id,
    username: profile?.username || null,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await getOptionalUser();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    const followingId = url.searchParams.get("followingId");
    const targetUserId = url.searchParams.get("userId") || user?.id;
    const session = viewer(user?.id ?? null);
    const pendingForMe = user
      ? and(
          eq(accountFollows.followingId, user.id),
          eq(accountFollows.status, "pending"),
        )
      : undefined;

    if (resource === "inbox-count") {
      if (!user) return NextResponse.json({ count: 0 });
      const [row] = await session.db
        .select({ pending: count() })
        .from(accountFollows)
        .where(pendingForMe);
      return NextResponse.json({ count: row?.pending ?? 0 });
    }

    if (resource === "requests" || resource === "inbox") {
      if (!user) return NextResponse.json({ data: [] });
      const rows = await session.db
        .select({
          created_at: accountFollows.createdAt,
          follower: {
            avatar_url: accounts.avatarUrl,
            display_name: accounts.displayName,
            username: accounts.username,
          },
          follower_id: accountFollows.followerId,
        })
        .from(accountFollows)
        .leftJoin(accounts, eq(accounts.id, accountFollows.followerId))
        .where(pendingForMe)
        .orderBy(desc(accountFollows.createdAt))
        .limit(REQUESTS_LIMIT);

      return NextResponse.json({
        data: rows.map((row) =>
          toSocialUser(row.follower_id, row.follower, row.created_at),
        ),
      });
    }

    if (resource === "followers" || resource === "following") {
      if (!targetUserId || !isUuid(targetUserId)) {
        return NextResponse.json({ data: [], next: null, total: 0 });
      }
      const before = cursorTime(url.searchParams.get("before"));
      const beforeId = url.searchParams.get("beforeId");

      let rows;
      let counts;
      try {
        [rows, counts] = await Promise.all([
          session.call("get_account_follows", {
            p_account_id: targetUserId,
            p_before: before,
            p_before_id: beforeId && isUuid(beforeId) ? beforeId : null,
            p_direction: resource,
            p_limit: FOLLOW_PAGE_SIZE,
          }),
          before
            ? null
            : session.call("get_account_follow_counts", {
                p_account_id: targetUserId,
              }),
        ]);
      } catch (error) {
        if (pgErrorCode(error) === "42501") {
          return NextResponse.json(
            { error: "This account is private" },
            { status: 403 },
          );
        }
        throw error;
      }

      const last =
        rows.length === FOLLOW_PAGE_SIZE ? rows[rows.length - 1] : null;
      const totals = counts?.[0];

      return NextResponse.json({
        data: rows.map((row) => ({
          ...toSocialUser(row.account_id, row, row.followed_at),
          viewerStatus: row.viewer_status,
        })),
        next: last
          ? { before: last.followed_at, beforeId: last.follow_id }
          : null,
        total: totals
          ? resource === "followers"
            ? totals.followers_count
            : totals.following_count
          : null,
      });
    }

    if (!user || !isUuid(followingId)) {
      return NextResponse.json({ status: null });
    }
    const [data] = await session.db
      .select({ status: accountFollows.status })
      .from(accountFollows)
      .where(
        and(
          eq(accountFollows.followerId, user.id),
          eq(accountFollows.followingId, followingId),
        ),
      )
      .limit(1);
    return NextResponse.json({ status: data?.status || null });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const limited = await rateLimitResponse(
      `social:follows:patch:${user.id}`,
      60,
    );
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const requesterId = String(body?.requesterId || "");
    if (!isUuid(requesterId)) {
      throw new UserError("Requester ID is required", 400);
    }
    const { db } = viewer(user.id);
    const pendingRequest = and(
      eq(accountFollows.followingId, user.id),
      eq(accountFollows.followerId, requesterId),
    );

    if (body.action === "accept") {
      await db
        .update(accountFollows)
        .set({ status: "accepted" })
        .where(pendingRequest);
      return NextResponse.json({ status: "accepted", success: true });
    }
    if (body.action === "reject") {
      await db.delete(accountFollows).where(pendingRequest);
      return NextResponse.json({ status: null, success: true });
    }
    throw new UserError("Invalid follow patch action", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const limited = await rateLimitResponse(
      `social:follows:mutate:${user.id}`,
      45,
    );
    if (limited) return limited;

    const payload = await request.json().catch(() => ({}));
    const followerId = String(payload?.followerId || "");
    if (!isUuid(followerId) || followerId === user.id) {
      throw new UserError("Invalid follow target", 400);
    }

    await viewer(user.id)
      .db.delete(accountFollows)
      .where(
        and(
          eq(accountFollows.followingId, user.id),
          eq(accountFollows.followerId, followerId),
        ),
      );
    return NextResponse.json({ status: null, success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
