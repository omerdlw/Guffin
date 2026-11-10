import { trimToNull } from "@omerdlw/base-framework/utils";
import type { TmdbConfig } from "@/lib/tmdb/transport";

interface SupabasePublicConfig {
  publishableKey: string;
  url: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = trimToNull(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = trimToNull(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!url || !publishableKey) return null;
  return { publishableKey, url };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabasePublicConfig());
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set the public URL and publishable key",
    );
  }
  return config;
}

export function requireSupabaseSecretKey(): string {
  const secretKey = trimToNull(process.env.SUPABASE_SECRET_KEY);
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required on the server");
  }
  return secretKey;
}

interface UpstashRedisConfig {
  token: string;
  url: string;
}

export function getUpstashRedisConfig(): UpstashRedisConfig | null {
  const url = trimToNull(process.env.UPSTASH_REDIS_REST_URL);
  const token = trimToNull(process.env.UPSTASH_REDIS_REST_TOKEN);

  if (!url || !token) return null;
  return { token, url };
}

export function getTmdbConfig(): TmdbConfig | null {
  const accessToken = trimToNull(process.env.TMDB_READ_ACCESS_TOKEN);
  if (!accessToken) return null;
  const baseUrl = trimToNull(process.env.TMDB_API_BASE_URL);
  return baseUrl ? { accessToken, baseUrl } : { accessToken };
}

export const AUTH_COOKIE_NAME = "GUFFIN_AUTH";
export const SESSION_CHECKED_HEADER = "x-guffin-session-checked";

export function isHttpsRequest(headers: Headers, protocol?: string): boolean {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded || protocol?.replace(/:$/, "")) === "https";
}

/** TV lands on main piece by piece; users see it once this is "true". */
export const TV_ENABLED = process.env.NEXT_PUBLIC_TV_ENABLED === "true";

/** Remembers the last Films/Shows vitrin a visitor picked on a profile. */
export const VITRIN_COOKIE_NAME = "GUFFIN_VITRIN";

/** Sentry's DSN; Sentry stays off when it is unset. Public: the browser needs it too. */
export function getSentryDsn(): string | null {
  return trimToNull(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/** The DSN's ingest origin, for the CSP's connect-src. */
export function getSentryOrigin(): string | null {
  const dsn = getSentryDsn();
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}
