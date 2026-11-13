import "server-only";

import { report, UserError } from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/http";
import { accountHref } from "@/lib/project";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  AccountPatchInput,
  CurrentAccount,
  PublicAccount,
} from "./account";

interface NormalizedAccountPatch {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bio: string | null;
  displayName: string;
  isPrivate: boolean;
  username: string;
}

type AccountRow = Pick<
  Database["public"]["Tables"]["accounts"]["Row"],
  | "avatar_url"
  | "background_url"
  | "bio"
  | "created_at"
  | "display_name"
  | "id"
  | "is_private"
  | "username"
>;

const USERNAME_PATTERN: RegExp = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

const PUBLIC_ACCOUNT_FIELDS =
  "id,username,display_name,avatar_url,background_url,bio,is_private,created_at";

function toPublicAccount(row: AccountRow): PublicAccount {
  return {
    avatarUrl: row.avatar_url || null,
    backgroundUrl: row.background_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    displayName: row.display_name ?? "",
    id: row.id,
    isPrivate: row.is_private,
    username: row.username ?? "",
  };
}

function toCurrentAccount(
  row: AccountRow,
  email: string | null,
): CurrentAccount {
  return { ...toPublicAccount(row), email };
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function normalizeUsername(value: unknown): string {
  const username = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserError(
      "Username must be 3-30 characters and contain letters, numbers, _ or -",
    );
  }
  return username;
}

function mergeAccountPatch(
  current: Pick<
    AccountRow,
    | "avatar_url"
    | "background_url"
    | "bio"
    | "display_name"
    | "is_private"
    | "username"
  >,
  input: AccountPatchInput,
): AccountPatchInput {
  const entries = Object.entries(input).filter(
    ([, value]) => value !== undefined,
  );
  return {
    avatarUrl: current.avatar_url,
    backgroundUrl: current.background_url,
    bio: current.bio,
    displayName: current.display_name ?? undefined,
    isPrivate: current.is_private,
    username: current.username ?? undefined,
    ...Object.fromEntries(entries),
  };
}

function normalizeAccountPatch(
  input: AccountPatchInput,
): NormalizedAccountPatch {
  const displayName = normalizeText(input.displayName, 80);
  if (!displayName) throw new UserError("Display name is required");

  return {
    avatarUrl: normalizeText(input.avatarUrl, 2048) || null,
    backgroundUrl: normalizeText(input.backgroundUrl, 2048) || null,
    bio: normalizeText(input.bio, 500) || null,
    displayName,
    isPrivate: input.isPrivate === true || input.isPrivate === "on",
    username: normalizeUsername(input.username),
  };
}

async function readAccountEmail(
  client: SupabaseClient<Database>,
  accountId: string,
): Promise<string | null> {
  const { data } = await client
    .from("account_emails")
    .select("email")
    .eq("account_id", accountId)
    .maybeSingle();
  return data?.email ?? null;
}

export async function getCurrentAccount({
  client,
  userId,
}: {
  client: SupabaseClient<Database>;
  userId: string;
}): Promise<{ account: CurrentAccount }> {
  const [accountResult, email] = await Promise.all([
    client.from("accounts").select("*").eq("id", userId).single(),
    readAccountEmail(client, userId),
  ]);

  if (accountResult.error) throw accountResult.error;

  return { account: toCurrentAccount(accountResult.data, email) };
}

export async function getPublicAccount({
  client,
  username,
}: {
  client: SupabaseClient<Database>;
  username?: string | null;
}): Promise<PublicAccount | null> {
  const identifier = (username ?? "").trim().toLowerCase();
  if (!identifier) return null;

  let query = client.from("accounts").select(PUBLIC_ACCOUNT_FIELDS);

  query = isUuid(identifier)
    ? query.or(`username.eq.${identifier},id.eq.${identifier}`)
    : query.eq("username", identifier);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? toPublicAccount(data) : null;
}

export async function updateAccount({
  client,
  input,
  userId,
}: {
  client: SupabaseClient<Database>;
  input: AccountPatchInput;
  userId: string;
}): Promise<{ account: CurrentAccount }> {
  const { data: current, error: fetchError } = await client
    .from("accounts")
    .select(
      "username, display_name, avatar_url, background_url, bio, is_private",
    )
    .eq("id", userId)
    .single();

  if (fetchError) throw fetchError;

  const patch = normalizeAccountPatch(mergeAccountPatch(current, input));

  const [updateResult, email] = await Promise.all([
    client.rpc("update_account", {
      p_avatar_url: patch.avatarUrl,
      p_background_url: patch.backgroundUrl,
      p_bio: patch.bio,
      p_display_name: patch.displayName,
      p_is_private: patch.isPrivate,
      p_username: patch.username,
    }),
    readAccountEmail(client, userId),
  ]);

  if (updateResult.error) {
    if (updateResult.error.code === "23505") {
      throw new UserError("That username is already taken", 409);
    }
    throw updateResult.error;
  }

  const updatedAccountRow = Array.isArray(updateResult.data)
    ? updateResult.data[0]
    : updateResult.data;

  return { account: toCurrentAccount(updatedAccountRow, email) };
}

export async function rememberWatchedPayload(
  client: SupabaseClient<Database>,
  accountId: string,
  tmdbId: number,
  payload: Json,
): Promise<void> {
  const { error } = await client
    .from("account_watched")
    .update({ payload })
    .eq("account_id", accountId)
    .eq("media_type", "movie")
    .eq("tmdb_id", tmdbId);
  if (error) report("Watched payload", error);
}

export function revalidateAccount(username?: string | null): void {
  if (username) revalidatePath(accountHref(username));
  revalidatePath("/account");
}
