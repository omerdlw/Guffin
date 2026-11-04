import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server";
import { apiErrorResponse, assertSameOrigin } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    if (!user.sessionId) {
      return NextResponse.json(
        { error: "Active session required" },
        { status: 400 },
      );
    }

    const { error } = await client.rpc("revoke_other_auth_sessions", {
      p_current_session_id: user.sessionId,
    });
    if (error) throw error;
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
