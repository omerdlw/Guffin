import { UserError } from "@omerdlw/base-framework/utils";
import { and, count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server";
import { viewer } from "@/lib/db/client";
import { pickAll } from "@/lib/db/pick";
import { accounts, notifications } from "@/lib/db/schema";
import { isUuid } from "@/lib/http";
import {
  apiErrorResponse,
  assertSameOrigin,
  rateLimitResponse,
} from "@/lib/security";

const DONE = { success: true };

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const { db } = viewer(user.id);
    const mine = eq(notifications.userId, user.id);

    if (params.get("resource") === "unread-count") {
      const [row] = await db
        .select({ unread: count() })
        .from(notifications)
        .where(and(mine, eq(notifications.read, false)));
      return NextResponse.json({ data: row?.unread ?? 0 });
    }

    const limit = Math.min(
      Math.max(1, Number(params.get("limitCount")) || 50),
      100,
    );
    const data = await db
      .select({
        ...pickAll(notifications),
        actor: {
          id: accounts.id,
          avatar_url: accounts.avatarUrl,
          display_name: accounts.displayName,
          username: accounts.username,
        },
      })
      .from(notifications)
      .leftJoin(accounts, eq(accounts.id, notifications.actorId))
      .where(mine)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const limited = await rateLimitResponse(
      `notifications:patch:${user.id}`,
      60,
    );
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const markRead = (where: ReturnType<typeof and>) =>
      viewer(user.id)
        .db.update(notifications)
        .set({ read: true, readAt: new Date().toISOString() })
        .where(and(eq(notifications.userId, user.id), where));

    if (body.action === "mark-read" && isUuid(body.notificationId)) {
      await markRead(eq(notifications.id, body.notificationId));
      return NextResponse.json(DONE);
    }
    if (body.action === "mark-all-read") {
      await markRead(eq(notifications.read, false));
      return NextResponse.json(DONE);
    }
    throw new UserError("Invalid notification patch action", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const limited = await rateLimitResponse(
      `notifications:delete:${user.id}`,
      60,
    );
    if (limited) return limited;

    const params = new URL(request.url).searchParams;
    const action = params.get("action");
    const notificationId = params.get("notificationId");
    const remove = (where?: ReturnType<typeof and>) =>
      viewer(user.id)
        .db.delete(notifications)
        .where(and(eq(notifications.userId, user.id), where));

    if (action === "delete" && isUuid(notificationId)) {
      await remove(eq(notifications.id, notificationId));
      return NextResponse.json(DONE);
    }
    if (action === "delete-all") {
      await remove();
      return NextResponse.json(DONE);
    }
    throw new UserError("Invalid notification delete action", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
