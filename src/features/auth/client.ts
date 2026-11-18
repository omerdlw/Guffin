import { UserError } from "@omerdlw/base-framework/utils";
import { authClient } from "@/lib/auth/client";
import { requestJson } from "@/lib/http";
import type { OAuthProvider } from "./session";

export interface LinkedIdentity {
  accountId: string;
  createdAt: string;
  id: string;
  provider: string;
}

export interface Passkey {
  createdAt: string | null;
  deviceType: string;
  id: string;
  name: string | null;
}

type Result<T> = { data: T | null; error: unknown };

function unwrap<T>(result: Result<T>, fallbackMessage: string): T {
  if (result.error) throw result.error;
  if (result.data == null) throw new UserError(fallbackMessage);
  return result.data;
}

function check(result: { error: unknown }): void {
  if (result.error) throw result.error;
}

function socialProvider(provider: OAuthProvider): "google" | "github" | "twitter" {
  return provider === "x" ? "twitter" : provider;
}

function fromSocialProvider(provider: string): string {
  return provider === "twitter" ? "x" : provider;
}

export function normalizeEmail(value: unknown): string {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserError("Enter a valid email address");
  }
  return email;
}

export async function requestEmailCode(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  check(
    await authClient.emailOtp.sendVerificationOtp({
      email: normalizedEmail,
      type: "sign-in",
    }),
  );
  return normalizedEmail;
}

export async function verifyEmailCode(email: string, otp: string): Promise<void> {
  check(await authClient.signIn.emailOtp({ email: normalizeEmail(email), otp }));
}

export async function requestEmailChange(newEmail: string): Promise<string> {
  const email = normalizeEmail(newEmail);
  check(await authClient.emailOtp.requestEmailChange({ newEmail: email }));
  return email;
}

export async function confirmEmailChange(newEmail: string, otp: string): Promise<void> {
  check(
    await authClient.emailOtp.changeEmail({ newEmail: normalizeEmail(newEmail), otp }),
  );
}

export async function signInSeedAccount(email: string): Promise<void> {
  await requestJson("/api/auth/seed", {
    body: JSON.stringify({ email: normalizeEmail(email) }),
    method: "POST",
    notifyOnError: false,
  });
}

export async function hasAccountUsername(): Promise<boolean> {
  const response = await requestJson<{
    account: { username: string | null } | null;
  }>("/api/account/me", {
    notifyOnError: false,
    notifyOnUnauthorized: false,
  }).catch(() => null);
  return Boolean(response?.account?.username);
}

export async function signInWithOAuth(
  provider: OAuthProvider,
  callbackURL: string,
): Promise<void> {
  check(
    await authClient.signIn.social({
      callbackURL,
      errorCallbackURL: "/?reason=callback-failed",
      provider: socialProvider(provider),
    }),
  );
}

export async function linkIdentity(
  provider: OAuthProvider,
  callbackURL: string,
): Promise<void> {
  check(
    await authClient.linkSocial({
      callbackURL,
      errorCallbackURL: "/?reason=link-failed",
      provider: socialProvider(provider),
    }),
  );
}

export async function unlinkIdentity(identity: LinkedIdentity): Promise<void> {
  check(await authClient.unlinkAccount({ accountId: identity.accountId }));
}

export async function getUserIdentities(): Promise<LinkedIdentity[]> {
  const accounts = unwrap(
    await authClient.listAccounts(),
    "Couldn't load your connected accounts",
  );
  return accounts.map((account) => ({
    accountId: account.accountId,
    createdAt: new Date(account.createdAt).toISOString(),
    id: account.id,
    provider: fromSocialProvider(account.providerId),
  }));
}

export async function signInWithPasskey(): Promise<void> {
  check(await authClient.signIn.passkey());
}

export async function registerPasskey(): Promise<void> {
  check(await authClient.passkey.addPasskey());
}

export async function listPasskeys(): Promise<Passkey[]> {
  const passkeys = unwrap(
    await authClient.passkey.listUserPasskeys(),
    "Couldn't load your passkeys",
  );
  return passkeys.map((passkey) => ({
    createdAt: passkey.createdAt ? new Date(passkey.createdAt).toISOString() : null,
    deviceType: passkey.deviceType,
    id: passkey.id,
    name: passkey.name ?? null,
  }));
}

export async function renamePasskey(id: string, name: string): Promise<void> {
  check(await authClient.passkey.updatePasskey({ id, name }));
}

export async function deletePasskey(id: string): Promise<void> {
  check(await authClient.passkey.deletePasskey({ id }));
}

export async function signOut(): Promise<void> {
  check(await authClient.signOut());
}

export async function signOutOtherSessions(): Promise<void> {
  check(await authClient.revokeOtherSessions());
}
