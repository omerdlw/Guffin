import type { UserIdentity } from "@supabase/supabase-js";
import { requestJson } from "@/lib/http";
import type { AuthClient, OAuthProvider, SignOutScope } from "./types";
import { normalizeEmail, unwrap } from "./utils";

export async function requestEmailAuth(
  client: AuthClient,
  {
    createUser = false,
    email,
    emailRedirectTo,
  }: { createUser?: boolean; email: string; emailRedirectTo?: string },
): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo, shouldCreateUser: createUser },
  });
  if (error) throw error;
  return normalizedEmail;
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

export async function verifyEmailOtp(
  client: AuthClient,
  email: string,
  token: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const asEmail = await client.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type: "email",
  });
  if (!asEmail.error) return;

  const asSignup = await client.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type: "signup",
  });
  if (asSignup.error) throw asEmail.error;
}

export async function signInWithOAuth(
  client: AuthClient,
  provider: OAuthProvider,
  redirectTo: string,
): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function linkIdentity(
  client: AuthClient,
  provider: OAuthProvider,
  redirectTo: string,
): Promise<void> {
  const { data, error } = await client.auth.linkIdentity({
    provider,
    options: { redirectTo },
  });
  if (error) throw error;
  if (data.url) window.location.assign(data.url);
}

export async function unlinkIdentity(
  client: AuthClient,
  identity: UserIdentity,
): Promise<void> {
  const { error } = await client.auth.unlinkIdentity(identity);
  if (error) throw error;
}

export async function getUserIdentities(
  client: AuthClient,
): Promise<UserIdentity[]> {
  const { data, error } = await client.auth.getUserIdentities();
  if (error) throw error;
  return data.identities;
}

export async function signInWithPasskey(client: AuthClient): Promise<void> {
  unwrap(
    await client.auth.signInWithPasskey(),
    "Couldn't sign in with your passkey",
  );
}

export async function registerPasskey(client: AuthClient): Promise<void> {
  unwrap(await client.auth.registerPasskey(), "Couldn't add your passkey");
}

export async function listPasskeys(client: AuthClient) {
  return unwrap(
    await client.auth.passkey.list(),
    "Couldn't load your passkeys",
  );
}

export async function renamePasskey(
  client: AuthClient,
  passkeyId: string,
  friendlyName: string,
): Promise<void> {
  unwrap(
    await client.auth.passkey.update({ friendlyName, passkeyId }),
    "Couldn't rename this passkey",
  );
}

export async function deletePasskey(
  client: AuthClient,
  passkeyId: string,
): Promise<void> {
  const { error } = await client.auth.passkey.delete({ passkeyId });
  if (error) throw error;
}

export async function signOut(
  client: AuthClient,
  scope: SignOutScope = "local",
): Promise<void> {
  const { error } = await client.auth.signOut({ scope });
  if (error) throw error;
}
