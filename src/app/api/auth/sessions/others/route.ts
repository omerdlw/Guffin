import { and, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server";
import { admin } from "@/lib/db/client";
import { authSessions } from "@/lib/db/schema";
import { apiErrorResponse, assertSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await admin()
      .db.delete(authSessions)
      .where(
        and(
          eq(authSessions.userId, user.id),
          ne(authSessions.id, user.sessionId),
        ),
      );
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
