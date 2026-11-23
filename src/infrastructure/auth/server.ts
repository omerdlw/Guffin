import "server-only";

import { passkey } from "@better-auth/passkey";
import { getSiteUrl, trimToNull } from "@omerdlw/base-framework/utils";
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
      const slot = `auth-rl:${key}`;
      const count = await redis.incr(slot);
      if (count === 1) await redis.expire(slot, window);
      if (count <= max) return { allowed: true, retryAfter: null };
      const ttl = await redis.ttl(slot);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : window };
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
      "/email-otp/send-verification-otp": { max: 5, window: 60 },
      "/sign-in/email-otp": { max: 10, window: 60 },
    },
    customStorage: rateLimitStorage(),
    enabled: true,
    storage: getRedisClient() ? undefined : "memory",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    expiresIn: 30 * DAY,
    freshAge: DAY,
    updateAge: DAY,
  },
  socialProviders: socialProviders(),
  telemetry: { enabled: false },
  trustedOrigins: [siteUrl],
});
