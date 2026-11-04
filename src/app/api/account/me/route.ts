import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/features/account/server";
import {
  requireRecentAuthentication,
  requireUser,
} from "@/features/auth/server";
import { apiErrorResponse, assertSameOrigin } from "@/lib/security";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    return NextResponse.json(
      await getCurrentAccount({ client, userId: user.id }),
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
    const admin = createAdminSupabaseClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiErrorResponse(error, { status: 400 });
  }
}
