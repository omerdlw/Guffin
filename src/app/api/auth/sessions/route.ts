import { and, desc, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server";
import { admin } from "@/lib/db/client";
import { authSessions } from "@/lib/db/schema";
import { apiErrorResponse } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await admin()
      .db.select({
        createdAt: authSessions.createdAt,
        id: authSessions.id,
        ipAddress: authSessions.ipAddress,
        updatedAt: authSessions.updatedAt,
        userAgent: authSessions.userAgent,
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, user.id),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(authSessions.updatedAt));

    return NextResponse.json({
      sessions: rows.map((session) => ({
        created_at: session.createdAt.toISOString(),
        ip_address: session.ipAddress,
        is_current: session.id === user.sessionId,
        last_seen_at: session.updatedAt.toISOString(),
        session_id: session.id,
        user_agent: session.userAgent,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
