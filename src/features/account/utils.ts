import { globalEvents } from "@omerdlw/base-framework/events";
import {
  isImageIconSource,
  trimToNull,
  USER_MESSAGES,
  UserError,
} from "@omerdlw/base-framework/utils";
import type {
  RealtimePostgresChangesPayload,
  User,
} from "@supabase/supabase-js";
import type { SyntheticEvent } from "react";
import {
  ACCOUNT_DATE_FORMAT,
  ISO_DAY_PATTERN,
  LAST_ACCOUNT_STORAGE_KEY,
  MOVIE_LIBRARY_KINDS,
  NOTIFICATION_DATE_FORMAT,
  SOCIAL_EVENTS,
  USERNAME_PATTERN,
} from "./constants";
import type {
  AccountClient,
  AccountPatchInput,
  AccountRow,
  AvatarSource,
  CurrentAccount,
  KnownAccount,
  MovieLibraryKind,
  MovieLibraryResult,
  MovieLibraryState,
  NormalizedAccountPatch,
  NotificationItem,
  PublicAccount,
  SocialCollection,
  SocialTab,
} from "./types";

export function toPublicAccount(row: AccountRow): PublicAccount {
  return {
    avatarUrl: row.avatar_url || null,
    backgroundUrl: row.background_url || null,
    bannerPosition: row.banner_position || null,
    bannerUrl: row.banner_url || null,
    bio: row.bio || null,
    createdAt: row.created_at,
    displayName: row.display_name ?? "",
    id: row.id,
    isPrivate: row.is_private,
    username: row.username ?? "",
  };
}

export function toCurrentAccount(
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

export function readAccountPatchField<K extends keyof AccountPatchInput, F>(
  input: AccountPatchInput | undefined,
  field: K,
  fallback: F,
): Exclude<AccountPatchInput[K], undefined> | F {
  const value = input?.[field];
  return value !== undefined
    ? (value as Exclude<AccountPatchInput[K], undefined>)
    : fallback;
}

export function normalizeAccountPatch(
  input: AccountPatchInput = {},
): NormalizedAccountPatch {
  const rawDisplayName = readAccountPatchField(input, "displayName", "");
  const displayName = normalizeText(rawDisplayName, 80);
  if (!displayName) throw new UserError("Display name is required");

  const rawAvatarUrl = readAccountPatchField(input, "avatarUrl", null);
  const rawBannerUrl = readAccountPatchField(input, "bannerUrl", null);
  const rawBackgroundUrl = readAccountPatchField(input, "backgroundUrl", null);
  const rawBannerPosition = readAccountPatchField(
    input,
    "bannerPosition",
    null,
  );
  const rawBio = readAccountPatchField(input, "bio", null);
  const rawIsPrivate = readAccountPatchField(input, "isPrivate", false);

  return {
    avatarUrl: normalizeText(rawAvatarUrl, 2048) || null,
    backgroundUrl: normalizeText(rawBackgroundUrl, 2048) || null,
    bannerPosition: normalizeText(rawBannerPosition, 64) || null,
    bannerUrl: normalizeText(rawBannerUrl, 2048) || null,
    bio: normalizeText(rawBio, 500) || null,
    displayName,
    isPrivate: rawIsPrivate === true || rawIsPrivate === "on",
    username: normalizeUsername(input.username),
  };
}

export function getInitial(value: unknown): string {
  const first = trimToNull(value)?.charAt(0).toUpperCase() ?? "";
  return /^[A-Z0-9]$/.test(first) ? first : "A";
}

export function getUserAvatarFallbackUrl(user: AvatarSource = {}): string {
  const initial = getInitial(
    user.displayName || user.display_name || user.username,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%"><rect width="200" height="200" fill="#0d0d0d"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#fcfcfb" font-family="ui-sans-serif, system-ui, sans-serif" font-size="82" font-weight="600">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarUrl(user: AvatarSource = {}): string {
  return (
    trimToNull(user.avatarUrl || user.avatar_url) ??
    getUserAvatarFallbackUrl(user)
  );
}

export function applyAvatarFallback(
  event: SyntheticEvent<HTMLImageElement>,
  fallbackUrl: string,
): void {
  const image = event.currentTarget;
  if (image.dataset.avatarFallbackApplied === "true") return;
  image.dataset.avatarFallbackApplied = "true";
  image.src = fallbackUrl;
}

const validDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatShortDate(value?: string | null): string {
  const date = validDate(value);
  return date ? ACCOUNT_DATE_FORMAT.format(date) : "";
}

export function timeAgo(value: string): string {
  const date = validDate(value);
  if (!date) return "";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return formatShortDate(value);
}

function sessionStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveLastKnownAccount(account: CurrentAccount): void {
  const known: KnownAccount = {
    avatarUrl: account.avatarUrl,
    displayName: account.displayName || null,
    email: account.email,
    id: account.id,
    username: account.username || null,
  };
  try {
    sessionStore()?.setItem(LAST_ACCOUNT_STORAGE_KEY, JSON.stringify(known));
  } catch {}
}

export function clearLastKnownAccount(): void {
  try {
    sessionStore()?.removeItem(LAST_ACCOUNT_STORAGE_KEY);
  } catch {}
}

function readLastKnownAccount(userId: string | null): KnownAccount | null {
  const store = sessionStore();
  try {
    const raw = store?.getItem(LAST_ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const known = JSON.parse(raw) as KnownAccount;
    if (userId && known.id && known.id !== userId) {
      store?.removeItem(LAST_ACCOUNT_STORAGE_KEY);
      return null;
    }
    return known;
  } catch {
    return null;
  }
}

export function signedInStatus({
  account,
  user,
}: {
  account: CurrentAccount | null;
  user: User | null;
}): { description: string; icon: string; title: string } {
  const cached = readLastKnownAccount(user?.id ?? null);
  const metadata = user?.user_metadata ?? {};
  const username = (account?.username || cached?.username || "")
    .trim()
    .replace(/^@+/, "");
  const handle = username ? `@${username}` : "";
  const email = user?.email || account?.email || cached?.email;

  const title =
    String(
      account?.displayName ||
        metadata.displayName ||
        metadata.display_name ||
        metadata.full_name ||
        metadata.name ||
        cached?.displayName ||
        "",
    ).trim() ||
    username ||
    email ||
    "Account";

  const sameAsTitle =
    title.toLowerCase() === handle.toLowerCase() ||
    title.toLowerCase() === username.toLowerCase();
  const description = handle && !sameAsTitle ? handle : "Signed in";

  const avatar = (account?.avatarUrl || cached?.avatarUrl || "").trim();
  const icon =
    avatar && isImageIconSource(avatar) ? avatar : "solar:login-2-bold";

  return { description, icon, title };
}

export function isMovieLibraryKind(value: unknown): value is MovieLibraryKind {
  return (MOVIE_LIBRARY_KINDS as readonly unknown[]).includes(value);
}

export function applyMovieLibraryChange(
  state: MovieLibraryState,
  kind: MovieLibraryKind,
  active: boolean,
): MovieLibraryState {
  const next = { ...state, [kind]: active };
  if (kind === "watched") {
    if (active) next.watchlist = false;
    else next.liked = false;
  }
  return next;
}

export function isDiaryDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DAY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function localDiaryDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const librarySuccess = (
  state: MovieLibraryState,
): MovieLibraryResult => ({
  state,
  success: true,
});

export const libraryFail = (error: string): MovieLibraryResult => ({
  error,
  success: false,
});

export function remove(
  client: AccountClient,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
) {
  switch (kind) {
    case "liked":
      return client
        .from("account_likes")
        .delete()
        .eq("account_id", accountId)
        .eq("tmdb_id", tmdbId);
    case "watched":
      return client
        .from("account_watched")
        .delete()
        .eq("account_id", accountId)
        .eq("tmdb_id", tmdbId);
    case "watchlist":
      return client
        .from("account_watchlist")
        .delete()
        .eq("account_id", accountId)
        .eq("tmdb_id", tmdbId);
  }
}

export function notificationAge(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return NOTIFICATION_DATE_FORMAT.format(date);
}

export function headlineOf({ actor, payload, type }: NotificationItem): string {
  if (actor) return actor.display_name || actor.username || "Anonymous User";
  if (type === "SYSTEM_ANNOUNCEMENT") {
    return payload?.title || "System Announcement";
  }
  return payload?.title || "Notification";
}

export function summaryOf({ payload, type }: NotificationItem): string {
  const subject = payload?.subjectTitle || payload?.targetTitle;
  switch (type) {
    case "FOLLOW_REQUEST":
      return "Requested to follow you";
    case "FOLLOW_ACCEPTED":
      return "Accepted your follow request";
    case "NEW_FOLLOWER":
      return "Started following you";
    case "MENTION":
      return subject ? `Mentioned you in ${subject}` : "Mentioned you";
    case "SYSTEM_ANNOUNCEMENT":
      return payload?.message || "System announcement";
    default: {
      const message = payload?.message || "Interacted with you";
      return subject ? `${message} in ${subject}` : message;
    }
  }
}

export const announceChange = () =>
  globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);

export const succeeded = (result: unknown) =>
  (result as { success?: boolean } | undefined)?.success === true;

export function changedRow<T extends Record<string, unknown>>(
  payload: RealtimePostgresChangesPayload<T>,
): Partial<T> {
  return payload.eventType === "DELETE" ? payload.old : payload.new;
}

export function withoutUser(
  collection: SocialCollection,
  id: string,
): SocialCollection {
  return {
    ...collection,
    list: collection.list.filter((user) => user.id !== id),
    total: collection.total === null ? null : Math.max(0, collection.total - 1),
  };
}

export function socialErrorMessage(error: unknown, tab: SocialTab): string {
  const status = (error as { status?: number } | null)?.status;
  if (status === 403) {
    return tab === "inbox"
      ? "You can't view these follow requests"
      : "This account is private";
  }
  if (status === 401) return USER_MESSAGES.unauthorized;
  return tab === "inbox"
    ? "Couldn't load your follow requests"
    : `Couldn't load ${tab}`;
}
