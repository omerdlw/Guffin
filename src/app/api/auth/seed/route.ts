import { type NextRequest, NextResponse } from "next/server";
import { signInSeedAccount } from "@/features/auth/server";
import { isSeedLoginEnabled } from "@/features/auth/utils";
import {
  apiErrorResponse,
  assertSameOrigin,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!isSeedLoginEnabled()) return new NextResponse(null, { status: 404 });

  try {
    assertSameOrigin(request);
    const limited = await rateLimitResponse(
      `seed-login:${getClientIp(request)}`,
      20,
    );
    if (limited) return limited;

    const payload = await request.json().catch(() => ({}));
    const userId = await signInSeedAccount(payload?.email);
    return NextResponse.json({ userId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
