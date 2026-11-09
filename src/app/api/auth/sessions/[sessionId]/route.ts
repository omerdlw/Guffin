import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server";
import { apiErrorResponse, assertSameOrigin } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("revoke_auth_session", {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
