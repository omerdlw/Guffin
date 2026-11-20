import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server";
import { admin } from "@/lib/db/client";
import { authSessions } from "@/lib/db/schema";
import { apiErrorResponse, assertSameOrigin } from "@/lib/security";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { sessionId } = await context.params;
    if (!sessionId || sessionId === user.sessionId) {
      return NextResponse.json(
        { error: "Use local sign-out for the current session" },
        { status: 400 },
      );
    }

    await admin()
      .db.delete(authSessions)
      .where(
        and(eq(authSessions.id, sessionId), eq(authSessions.userId, user.id)),
      );
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
