import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/features/auth/server";
import { sanitizeNextPath } from "@/features/auth/session";
import { admin } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.redirect(new URL("/?reason=callback-failed", url));
  }

  const [account] = await admin()
    .db.select({ username: accounts.username })
    .from(accounts)
    .where(eq(accounts.id, user.id))
    .limit(1);

  if (!account?.username) {
    const setupUrl = new URL("/", url);
    setupUrl.searchParams.set("setup", "account");
    setupUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(setupUrl);
  }

  const redirectUrl = new URL(nextPath, url);
  redirectUrl.searchParams.set("auth", "login");
  return NextResponse.redirect(redirectUrl);
}
