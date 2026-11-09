import "server-only";
import {
  isPrivateAddress,
  isPublicImageUrl,
} from "@omerdlw/base-framework/ambient/server";
import {
  report,
  USER_MESSAGES,
  UserError,
} from "@omerdlw/base-framework/utils";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { Readable } from "node:stream";
import { getUpstashRedisConfig } from "./env";

let client: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (client) return client;
  const config = getUpstashRedisConfig();
  if (!config) return null;
  client = new Redis(config);
  return client;
}

interface ContentSecurityPolicyOptions {
  nonce: string;
  connectSrc?: string[];
  development?: boolean;
  upgradeInsecureRequests?: boolean;
}

export function buildContentSecurityPolicy({
  connectSrc = [],
  development = false,
  nonce,
  upgradeInsecureRequests = false,
}: ContentSecurityPolicyOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://api.iconify.design",
      "https://api.simplesvg.com",
      "https://api.unisvg.com",
      "https://image.tmdb.org",
      ...connectSrc,
    ],
    "frame-src": [
      "https://www.youtube-nocookie.com",
      "https://www.youtube.com",
    ],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(
    ([key, values]) => `${key} ${values.join(" ")}`,
  );
  if (upgradeInsecureRequests) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function applySecurityHeaders(
  response: NextResponse,
  csp: string,
): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

const WINDOW_MS = 60_000;
const MAX_ENTRIES = 10_000;

interface RateLimitResult {
  limit: number;
  remaining: number;
  resetTime: number;
  success: boolean;
}

const memory = new Map<string, { count: number; resetTime: number }>();
const limiters = new Map<number, Ratelimit>();

function pruneMemory(now: number): void {
  for (const [key, record] of memory) {
    if (record.resetTime <= now) memory.delete(key);
  }
  for (const key of memory.keys()) {
    if (memory.size < MAX_ENTRIES) break;
    memory.delete(key);
  }
}

function checkMemory(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  let record = memory.get(key);
  memory.delete(key);
  if (!record || record.resetTime <= now) {
    if (memory.size >= MAX_ENTRIES) pruneMemory(now);
    record = { count: 0, resetTime: now + WINDOW_MS };
  }
  record.count += 1;
  memory.set(key, record);

  return {
    limit,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime,
    success: record.count <= limit,
  };
}

function upstashLimiter(limit: number): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;
  let limiter = limiters.get(limit);
  if (!limiter) {
    limiter = new Ratelimit({
      analytics: false,
      limiter: Ratelimit.slidingWindow(limit, `${WINDOW_MS} ms`),
      prefix: "bf:ratelimit",
      redis,
    });
    limiters.set(limit, limiter);
  }
  return limiter;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export async function checkRateLimit(
  key: string,
  perMinute: number,
): Promise<RateLimitResult> {
  try {
    const limiter = upstashLimiter(perMinute);
    if (limiter) {
      const result = await limiter.limit(key);
      return {
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.reset,
        success: result.success,
      };
    }
  } catch (error) {
    report("RateLimiter Upstash fallback", error, "warn");
  }
  return checkMemory(key, perMinute);
}

export async function rateLimitResponse(
  key: string,
  perMinute: number,
): Promise<Response | null> {
  const result = await checkRateLimit(key, perMinute);
  if (result.success) return null;
  return Response.json(
    { error: "Too many requests — please try again later" },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000)),
        ),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
      },
    },
  );
}

export function assertSameOrigin(request: Request): void {
  try {
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");

    if (originHeader) {
      const headerOrigin = new URL(originHeader).origin;
      if (headerOrigin === requestOrigin) return;
    } else if (fetchSite === "same-origin") {
      return;
    }
  } catch {}

  throw new UserError("Cross-site request rejected", 403);
}

export function apiErrorResponse(
  error: unknown,
  { fallback = USER_MESSAGES.server, status = 500 } = {},
): NextResponse {
  if (error instanceof UserError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status ?? 400 },
    );
  }

  report("API route", error);
  return NextResponse.json({ error: fallback }, { status });
}

export const isPublicHttps = (url: URL) =>
  url.protocol === "https:" && isPublicImageUrl(url);

const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, found) => {
    if (error) return callback(error, "", 0);
    const addresses = found as LookupAddress[];
    if (
      !addresses.length ||
      addresses.some((a) => isPrivateAddress(a.address))
    ) {
      const refused = Object.assign(new Error(`Refused ${hostname}`), {
        code: "ENOTFOUND",
      });
      return callback(refused, "", 0);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

const BODILESS = new Set([101, 204, 205, 304]);

export const pinnedFetch = ((input: URL | RequestInfo, init?: RequestInit) =>
  new Promise<Response>((resolve, reject) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.protocol !== "https:") {
      reject(new Error("Only https is read"));
      return;
    }
    const outgoing = request(
      url,
      {
        headers: { accept: "image/*" },
        lookup: publicOnlyLookup,
        method: "GET",
        signal: init?.signal ?? undefined,
      },
      (incoming) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (value === undefined) continue;
          for (const item of Array.isArray(value) ? value : [value]) {
            headers.append(name, item);
          }
        }
        const status = incoming.statusCode ?? 502;
        if (BODILESS.has(status)) incoming.resume();
        resolve(
          new Response(
            BODILESS.has(status)
              ? null
              : (Readable.toWeb(incoming) as ReadableStream<Uint8Array>),
            { headers, status },
          ),
        );
      },
    );
    outgoing.on("error", reject);
    outgoing.end();
  })) as typeof fetch;
