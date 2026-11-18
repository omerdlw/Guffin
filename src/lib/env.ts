import { trimToNull } from "@omerdlw/base-framework/utils";
import type { TmdbConfig } from "@/lib/tmdb/transport";

export function requireDatabaseUrl(): string {
  const url = trimToNull(process.env.DATABASE_URL);
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at Postgres",
    );
  }
  return url;
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


export function isHttpsRequest(headers: Headers, protocol?: string): boolean {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded || protocol?.replace(/:$/, "")) === "https";
}

export const TV_ENABLED = process.env.NEXT_PUBLIC_TV_ENABLED === "true";

export const VITRIN_COOKIE_NAME = "GUFFIN_VITRIN";

export function getSentryDsn(): string | null {
  return trimToNull(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function getSentryOrigin(): string | null {
  const dsn = getSentryDsn();
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}
