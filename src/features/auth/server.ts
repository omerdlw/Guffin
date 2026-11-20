import "server-only";

import { cache } from "react";
import {
  report,
  toUserMessage,
  UserError,
} from "@omerdlw/base-framework/utils";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { admin, type Session, viewer } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/security";
import { fail, type MutationResult } from "./mutation";
import { SEED_EMAIL_DOMAIN } from "./session";

interface AuthUser {
  email: string;
  id: string;
  sessionCreatedAt: Date;
  sessionId: string;
}

const MAX_AUTH_AGE_MS = 10 * 60 * 1000;

const NOT_A_SEED_ACCOUNT = "This is not a test account";

export const getOptionalUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;
    return {
      email: session.user.email,
      id: session.user.id,
      sessionCreatedAt: new Date(session.session.createdAt),
      sessionId: session.session.id,
    };
  } catch (error) {
    unstable_rethrow(error);
    report("Read session", error);
    return null;
  }
});

export const getViewerSession = cache(async (): Promise<Session> => {
  const user = await getOptionalUser();
  return viewer(user?.id ?? null);
});

export async function requireUser({
  redirectTo,
}: { redirectTo?: string } = {}): Promise<AuthUser> {
  const user = await getOptionalUser();
  if (user) return user;
  if (redirectTo) redirect(redirectTo);
  throw new UserError("Authentication required", 401);
}

export async function requireRecentAuthentication(): Promise<AuthUser> {
  const user = await requireUser();
  if (Date.now() - user.sessionCreatedAt.getTime() > MAX_AUTH_AGE_MS) {
    throw new UserError(
      "For your security, please sign in again to continue",
      403,
    );
  }
  return user;
}

export async function mutate<T extends object = object>(
  {
    fallback,
    name,
    perMinute = 120,
    scope = "account-change",
  }: { fallback: string; name: string; perMinute?: number; scope?: string },
  work: (context: {
    session: Session;
    userId: string;
  }) => Promise<MutationResult<T>>,
): Promise<MutationResult<T>> {
  try {
    const user = await requireUser();
    const limit = await checkRateLimit(`${scope}:${user.id}`, perMinute);
    if (!limit.success) return fail("Too many requests, slow down a little");

    return await work({ session: viewer(user.id), userId: user.id });
  } catch (error) {
    report(name, error);
    return fail(toUserMessage(error, { fallback }));
  }
}

export async function signInSeedAccount(value: unknown): Promise<string> {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 254 || !email.endsWith(`@${SEED_EMAIL_DOMAIN}`)) {
    throw new UserError(NOT_A_SEED_ACCOUNT, 403);
  }

  const [seed] = await admin()
    .db.select({ id: authUsers.id })
    .from(authUsers)
    .where(and(eq(authUsers.email, email), eq(authUsers.isSeed, true)))
    .limit(1);
  if (!seed) throw new UserError(NOT_A_SEED_ACCOUNT, 403);

  const otp = await auth.api.createVerificationOTP({
    body: { email, type: "sign-in" },
  });
  await auth.api.signInEmailOTP({
    body: { email, otp },
    headers: await headers(),
  });
  return seed.id;
}
