import "server-only";

import { NextResponse } from "next/server";
import {
  report,
  trimToNull,
  USER_MESSAGES,
  UserError,
} from "@omerdlw/base-framework/utils";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { timingSafeEqual } from "node:crypto";
import { getUpstashRedisConfig } from "./config";

let client: Redis | null = null;

// Redis is a cache and a limiter here, never the source of truth, so a slow
// or dropped connection must fail fast instead of holding a render: each
// command gets REDIS_TIMEOUT_MS, and one quick retry instead of the default
// five exponential ones (~7s).
const REDIS_TIMEOUT_MS = 1_500;

export function getRedisClient(): Redis | null {
  if (client) return client;
  const config = getUpstashRedisConfig();
  if (!config) return null;
  client = new Redis({
    ...config,
    retry: { backoff: () => 100, retries: 1 },
    signal: () => AbortSignal.timeout(REDIS_TIMEOUT_MS),
  });
  return client;
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
      // Past this the request is let through rather than kept waiting.
      timeout: REDIS_TIMEOUT_MS,
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

export function isCronRequest(request: Request): boolean {
  const secret = trimToNull(process.env.CRON_SECRET);
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
