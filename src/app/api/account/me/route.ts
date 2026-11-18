import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/features/account/server";
import {
  requireRecentAuthentication,
  requireUser,
} from "@/features/auth/server";
import { admin, viewer } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";
import { apiErrorResponse, assertSameOrigin } from "@/lib/security";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    return NextResponse.json(
      await getCurrentAccount({ session: viewer(user.id), userId: user.id }),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const payload = await request.json().catch(() => ({}));
    if (payload.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'Type "DELETE" to permanently remove the account' },
        { status: 400 },
      );
    }
    const user = await requireRecentAuthentication();
    await admin().db.delete(authUsers).where(eq(authUsers.id, user.id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiErrorResponse(error, { status: 400 });
  }
}
