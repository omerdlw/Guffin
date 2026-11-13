import { getSiteUrl, trimToNull } from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type AuthClient = SupabaseClient<Database>;

export type OAuthProvider = "google" | "github" | "x";

export type SignOutScope = "local" | "global" | "others";

const AUTH_CALLBACK_PATH = "/auth/callback";

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = Object.freeze([
  "google",
  "github",
  "x",
]);

export const SEED_EMAIL_DOMAIN = "seed.tvizzie.test";

export function sanitizeNextPath(
  value: unknown,
  fallback = "/account",
): string {
  const path = trimToNull(value);
  if (!path || !/^\/(?!\/)[^\\\u0000-\u001f]*$/.test(path)) return fallback;
  return path;
}

export function getAuthCallbackUrl(nextPath = "/account"): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : getSiteUrl();
  const callback = new URL(AUTH_CALLBACK_PATH, origin);
  callback.searchParams.set("next", sanitizeNextPath(nextPath));
  return callback.toString();
}

export function isSeedLoginEnabled(): boolean {
  return (
    process.env.SEED_LOGIN === "1" && process.env.VERCEL_ENV !== "production"
  );
}
