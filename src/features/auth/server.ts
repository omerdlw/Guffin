import "server-only";
import {
  report,
  toUserMessage,
  UserError,
} from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_CHECKED_HEADER } from "@/lib/env";
import { checkRateLimit } from "@/lib/security";
import type { Database } from "@/lib/supabase/database.types";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import {
  MAX_AUTH_AGE_SECONDS,
  NOT_A_SEED_ACCOUNT,
  SEED_EMAIL_DOMAIN,
} from "./constants";
import type { AuthUser, MutationResult } from "./types";
import { fail, latestAuthenticationAt, toAuthUser } from "./utils";

export async function getOptionalUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const user = error ? null : toAuthUser(data?.claims);
  if (!user) return null;

  const checkedByProxy =
    (await headers()).get(SESSION_CHECKED_HEADER) === user.sessionId;
  if (!user.sessionId || checkedByProxy) return user;

  try {
    const { data: session, error: sessionError } = await supabase
      .from("auth_sessions")
      .select("revoked_at")
      .eq("session_id", user.sessionId)
      .maybeSingle();
    return sessionError || session?.revoked_at ? null : user;
  } catch {
    return null;
  }
}

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
  const at = latestAuthenticationAt(user);
  const age = Math.floor(Date.now() / 1000) - at;
  if (!at || age > MAX_AUTH_AGE_SECONDS) {
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
    client: SupabaseClient<Database>;
    userId: string;
  }) => Promise<MutationResult<T>>,
): Promise<MutationResult<T>> {
  try {
    const user = await requireUser();
    const limit = await checkRateLimit(`${scope}:${user.id}`, perMinute);
    if (!limit.success) return fail("Too many requests, slow down a little");

    const client = await createServerSupabaseClient();
    return await work({ client, userId: user.id });
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

  const admin = createAdminSupabaseClient();
  const { data: owner, error: ownerError } = await admin
    .from("account_emails")
    .select("account_id")
    .eq("email", email)
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (!owner) throw new UserError(NOT_A_SEED_ACCOUNT, 403);

  const { data: found, error: userError } = await admin.auth.admin.getUserById(
    owner.account_id,
  );
  if (userError) throw userError;
  if (found.user?.app_metadata?.seed !== true) {
    throw new UserError(NOT_A_SEED_ACCOUNT, 403);
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    email,
    type: "magiclink",
  });
  if (linkError) throw linkError;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "email",
  });
  if (error?.status === 429) {
    throw new UserError("Too many sign-ins, wait a few minutes", 429);
  }
  if (error) throw error;

  return found.user.id;
}
