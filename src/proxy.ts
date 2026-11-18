import { type NextRequest, NextResponse } from "next/server";
import { getSentryOrigin, isHttpsRequest } from "@/lib/env";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  createNonce,
} from "@/lib/security";

export function proxy(request: NextRequest) {
  const sentry = getSentryOrigin();
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    connectSrc: sentry ? [sentry] : [],
    development: process.env.NODE_ENV === "development",
    nonce,
    upgradeInsecureRequests: isHttpsRequest(
      request.headers,
      request.nextUrl.protocol,
    ),
  });

  request.headers.set("content-security-policy", csp);
  request.headers.set("x-nonce", nonce);
  return applySecurityHeaders(NextResponse.next({ request }), csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
