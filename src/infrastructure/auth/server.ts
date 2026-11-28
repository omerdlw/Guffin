import "server-only";

import { passkey } from "@better-auth/passkey";
import { getSiteUrl, report, trimToNull } from "@omerdlw/base-framework/utils";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { admin } from "@/infrastructure/db/client";
import {
  authAccounts,
  authPasskeys,
  authSessions,
  authUsers,
  authVerifications,
} from "@/infrastructure/db/schema";
import { otpEmail, sendEmail } from "@/infrastructure/email";
import { getRedisClient } from "@/infrastructure/security";
import {
  AUTH_COOKIE_PREFIX,
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "./shared";

const DAY = 60 * 60 * 24;

function socialProviders(): BetterAuthOptions["socialProviders"] {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  for (const provider of OAUTH_PROVIDERS) {
    const prefix = provider.toUpperCase();
    const clientId = trimToNull(process.env[`${prefix}_CLIENT_ID`]);
    const clientSecret = trimToNull(process.env[`${prefix}_CLIENT_SECRET`]);
    if (!clientId || !clientSecret) continue;
    providers[providerKey(provider)] = { clientId, clientSecret };
  }
  return providers;
}

function providerKey(provider: OAuthProvider): "google" | "github" | "twitter" {
  return provider === "x" ? "twitter" : provider;
}

function rateLimitStorage(): NonNullable<
  BetterAuthOptions["rateLimit"]
>["customStorage"] {
  const redis = getRedisClient();
  if (!redis) return undefined;
  return {
    async consume(key, { max, window }) {
      // One atomic round trip: a separate EXPIRE that is lost (network drop)
      // leaves the counter without a TTL, and every client on that IP gets
      // 429 forever. EXPIRE NX also heals any counter already stuck that way.
      // An unreachable Redis lets the request through: a limiter outage
      // must not sign everyone out.
      const slot = `auth-rl:${key}`;
      try {
        const [count, , ttl] = await redis
          .multi()
          .incr(slot)
          .expire(slot, window, "NX")
          .ttl(slot)
          .exec<[number, 0 | 1, number]>();
        if (count <= max) return { allowed: true, retryAfter: null };
        return { allowed: false, retryAfter: ttl > 0 ? ttl : window };
      } catch (error) {
        report("Auth rate limit", error, "warn");
        return { allowed: true, retryAfter: null };
      }
    },
  };
}

const siteUrl = getSiteUrl();

export const auth = betterAuth({
  account: {
    accountLinking: {
      allowDifferentEmails: true,
      allowUnlinkingAll: true,
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  advanced: {
    cookiePrefix: AUTH_COOKIE_PREFIX,
    database: { generateId: "uuid" },
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"],
    },
  },
  baseURL: siteUrl,
  database: drizzleAdapter(admin().db, {
    provider: "pg",
    schema: {
      account: authAccounts,
      passkey: authPasskeys,
      session: authSessions,
      user: authUsers,
      verification: authVerifications,
    },
  }),
  emailAndPassword: { enabled: false },
  plugins: [
    emailOTP({
      allowedAttempts: 5,
      changeEmail: { enabled: true },
      expiresIn: 600,
      otpLength: 6,
      async sendVerificationOTP({ email, otp, type }) {
        await sendEmail(otpEmail(email, otp, type));
      },
      storeOTP: "hashed",
    }),
    passkey({
      origin: siteUrl,
      rpID: new URL(siteUrl).hostname,
      rpName: "Guffin",
      schema: { passkey: { fields: { credentialID: "credentialId" } } },
    }),
    nextCookies(),
  ],
  rateLimit: {
    customRules: {
      // Every page asks for it; answered from the cookie cache, it costs
      // nothing to protect, while counting it costs a Redis trip each time.
      "/get-session": false,
      "/email-otp/send-verification-otp": { max: 5, window: 60 },
      "/sign-in/email-otp": { max: 10, window: 60 },
    },
    customStorage: rateLimitStorage(),
    enabled: true,
    storage: getRedisClient() ? undefined : "memory",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    // Every signed-in request reads the session; a signed cookie answers it
    // without a database trip. A session revoked elsewhere (sign out other
    // devices) stays readable here for at most maxAge.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
    expiresIn: 30 * DAY,
    freshAge: DAY,
    updateAge: DAY,
  },
  socialProviders: socialProviders(),
  telemetry: { enabled: false },
  trustedOrigins: [siteUrl],
});
