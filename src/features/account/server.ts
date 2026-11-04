import "server-only";
import { report, UserError } from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/http";
import type { Database, Json } from "@/lib/supabase/database.types";
import { PUBLIC_ACCOUNT_FIELDS } from "./constants";
import type { AccountPatchInput, CurrentAccount, PublicAccount } from "./types";
import {
  mergeAccountPatch,
  normalizeAccountPatch,
  toCurrentAccount,
  toPublicAccount,
} from "./utils";

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
      "username, display_name, avatar_url, banner_url, banner_position, background_url, bio, is_private",
    )
    .eq("id", userId)
    .single();

  if (fetchError) throw fetchError;

  const patch = normalizeAccountPatch(mergeAccountPatch(current, input));

  const [updateResult, email] = await Promise.all([
    client.rpc("update_account", {
      p_avatar_url: patch.avatarUrl,
      p_background_url: patch.backgroundUrl,
      p_banner_position: patch.bannerPosition,
      p_banner_url: patch.bannerUrl,
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
    .eq("tmdb_id", tmdbId);
  if (error) report("Watched payload", error);
}
