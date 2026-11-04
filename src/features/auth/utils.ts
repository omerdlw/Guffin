import {
  getSiteUrl,
  toUserMessage,
  trimToNull,
  UserError,
} from "@omerdlw/base-framework/utils";
import type { Session } from "@supabase/supabase-js";
import {
  AUTH_CALLBACK_PATH,
  AUTH_ERROR_CODES,
  OTP_LENGTH,
  SEED_EMAIL_DOMAIN,
  WEBAUTHN_ERRORS,
} from "./constants";
import type { AuthState, AuthUser, MutationResult } from "./types";

export function normalizeEmail(value: unknown): string {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserError("Enter a valid email address");
  }
  return email;
}

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

export function toAuthUser(
  claims: Record<string, unknown> | null | undefined,
): AuthUser | null {
  if (typeof claims?.sub !== "string") return null;
  return {
    aal: typeof claims.aal === "string" ? claims.aal : "aal1",
    claims,
    email: typeof claims.email === "string" ? claims.email : null,
    id: claims.sub,
    sessionId: typeof claims.session_id === "string" ? claims.session_id : null,
  };
}

export function authStateFrom(session: Session | null): AuthState {
  return {
    error: null,
    isAuthenticated: Boolean(session?.user),
    isConfigured: true,
    isReady: true,
    session,
    user: session?.user ?? null,
  };
}

export function getAuthErrorMessage(error: unknown, fallback?: string): string {
  const name = (error as { name?: string } | null)?.name;
  if (name && WEBAUTHN_ERRORS[name]) return WEBAUTHN_ERRORS[name];
  return toUserMessage(error, { codes: AUTH_ERROR_CODES, fallback });
}

export function unwrap<T>(
  result: { data: T | null; error: unknown },
  fallbackMessage: string,
): T {
  if (result.error) throw result.error;
  if (!result.data) throw new UserError(fallbackMessage);
  return result.data;
}

export function isSeedEmail(email: string): boolean {
  return (
    process.env.NEXT_PUBLIC_SEED_LOGIN === "1" &&
    email.trim().toLowerCase().endsWith(`@${SEED_EMAIL_DOMAIN}`)
  );
}

export function latestAuthenticationAt(user: AuthUser): number {
  const methods = user.claims.amr;
  if (!Array.isArray(methods)) return 0;
  return methods.reduce<number>((latest, method) => {
    const at = Number((method as { timestamp?: unknown })?.timestamp) || 0;
    return Math.max(latest, at);
  }, 0);
}

export const fail = (error: string): { error: string; success: false } => ({
  error,
  success: false,
});

export const ok = <T extends object = object>(extra?: T) =>
  ({ success: true, ...extra }) as MutationResult<T>;

export function isSeedLoginEnabled(): boolean {
  return (
    process.env.SEED_LOGIN === "1" && process.env.VERCEL_ENV !== "production"
  );
}

export function normalizeOtpValue(value?: string): string {
  return (value ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);
}
