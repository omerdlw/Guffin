import "server-only";

import { report, UserError } from "@omerdlw/base-framework/utils";
import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { pgErrorCode, type Session } from "@/infrastructure/db/client";
import { pick, type SnakeRow } from "@/infrastructure/db/pick";
import { accountEmails, accounts, accountWatched } from "@/infrastructure/db/schema";
import { isUuid } from "@/infrastructure/http";
import { accountHref } from "@/shared/project";
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
  SnakeRow<typeof accounts>,
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

const PUBLIC_ACCOUNT_FIELDS = pick(accounts, [
  "id",
  "username",
  "display_name",
  "avatar_url",
  "background_url",
  "bio",
  "is_private",
  "created_at",
]);

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
  session: Session,
  accountId: string,
): Promise<string | null> {
  const [row] = await session.db
    .select({ email: accountEmails.email })
    .from(accountEmails)
    .where(eq(accountEmails.accountId, accountId))
    .limit(1);
  return row?.email ?? null;
}

async function readAccountRow(
  session: Session,
  accountId: string,
): Promise<AccountRow> {
  const [row] = await session.db
    .select(PUBLIC_ACCOUNT_FIELDS)
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!row) throw new UserError("Account not found", 404);
  return row;
}

export async function getCurrentAccount({
  session,
  userId,
}: {
  session: Session;
  userId: string;
}): Promise<{ account: CurrentAccount }> {
  const [row, email] = await Promise.all([
    readAccountRow(session, userId),
    readAccountEmail(session, userId),
  ]);
  return { account: toCurrentAccount(row, email) };
}

export async function getPublicAccount({
  session,
  username,
}: {
  session: Session;
  username?: string | null;
}): Promise<PublicAccount | null> {
  const identifier = (username ?? "").trim().toLowerCase();
  if (!identifier) return null;

  const [row] = await session.db
    .select(PUBLIC_ACCOUNT_FIELDS)
    .from(accounts)
    .where(
      isUuid(identifier)
        ? or(eq(accounts.username, identifier), eq(accounts.id, identifier))
        : eq(accounts.username, identifier),
    )
    .limit(1);
  return row ? toPublicAccount(row) : null;
}

export async function updateAccount({
  input,
  session,
  userId,
}: {
  input: AccountPatchInput;
  session: Session;
  userId: string;
}): Promise<{ account: CurrentAccount }> {
  const current = await readAccountRow(session, userId);
  const patch = normalizeAccountPatch(mergeAccountPatch(current, input));

  try {
    const [rows, email] = await Promise.all([
      session.call("update_account", {
        p_avatar_url: patch.avatarUrl,
        p_background_url: patch.backgroundUrl,
        p_bio: patch.bio,
        p_display_name: patch.displayName,
        p_is_private: patch.isPrivate,
        p_username: patch.username,
      }),
      readAccountEmail(session, userId),
    ]);
    const updated = rows[0];
    if (!updated) throw new UserError("Account not found", 404);
    return { account: toCurrentAccount(updated, email) };
  } catch (error) {
    if (pgErrorCode(error) === "23505") {
      throw new UserError("That username is already taken", 409);
    }
    throw error;
  }
}

export async function rememberWatchedPayload(
  session: Session,
  accountId: string,
  tmdbId: number,
  payload: unknown,
): Promise<void> {
  try {
    await session.db
      .update(accountWatched)
      .set({ payload })
      .where(
        and(
          eq(accountWatched.accountId, accountId),
          eq(accountWatched.tmdbId, tmdbId),
        ),
      );
  } catch (error) {
    report("Watched payload", error);
  }
}

export function revalidateAccount(username?: string | null): void {
  if (username) revalidatePath(accountHref(username));
  revalidatePath("/account");
}
