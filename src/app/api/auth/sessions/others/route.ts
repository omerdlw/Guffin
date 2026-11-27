import { type NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { requireUser } from "@/features/auth/server";
import { admin } from "@/infrastructure/db/client";
import { authSessions } from "@/infrastructure/db/schema";
import { apiErrorResponse, assertSameOrigin } from "@/infrastructure/security";

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
