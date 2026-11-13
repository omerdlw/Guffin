import type { SyntheticEvent } from "react";
import { isImageIconSource, trimToNull } from "@omerdlw/base-framework/utils";
import type { User } from "@supabase/supabase-js";

export interface PublicAccount {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bio: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  isPrivate: boolean;
  username: string;
}

export interface CurrentAccount extends PublicAccount {
  email: string | null;
}

export interface AccountPatchInput {
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  bio?: string | null;
  displayName?: string;
  isPrivate?: boolean | string;
  username?: string;
}

interface FollowChange {
  followerId?: string | null;
  followingId: string | null;
  status: string | null;
}

export interface AvatarSource {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
}

interface KnownAccount {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  id: string | null;
  username: string | null;
}

export type MovieLibraryKind = (typeof MOVIE_LIBRARY_KINDS)[number];

export interface MovieLibraryState {
  liked: boolean;
  watched: boolean;
  watchlist: boolean;
}

export interface NotificationItem {
  actor: {
    avatar_url: string | null;
    display_name: string | null;
    id: string;
    username: string | null;
  } | null;
  created_at: string;
  id: string;
  payload: {
    message?: string;
    subjectTitle?: string;
    targetTitle?: string;
    title?: string;
  } | null;
  read: boolean;
  type: string;
}

declare module "@omerdlw/base-framework/events" {
  interface FrameworkEventMap {
    [SOCIAL_EVENTS.FOLLOW_CHANGE]: FollowChange;
    [SOCIAL_EVENTS.INBOX_CHANGE]: undefined;
    [SOCIAL_EVENTS.NOTIFICATION_CHANGE]: undefined;
  }
}

export const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";

export const NOTIFICATIONS_ICON = "solar:bell-bold";

export const NOTIFICATIONS_TITLE = "Notifications";

export const SOCIAL_EVENTS = Object.freeze({
  FOLLOW_CHANGE: "social:follow-change",
  INBOX_CHANGE: "social:inbox-change",
  NOTIFICATION_CHANGE: "social:notification-change",
} as const);

const ACCOUNT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const LAST_ACCOUNT_STORAGE_KEY = "GUFFIN_LAST_ACCOUNT";

export const MOVIE_LIBRARY_KINDS = ["liked", "watched", "watchlist"] as const;

export const EMPTY_MOVIE_LIBRARY: MovieLibraryState = Object.freeze({
  liked: false,
  watched: false,
  watchlist: false,
});

export const FOLLOWS_URL = "/api/social/follows";

export const SILENT_UNAUTHORIZED = { notifyOnUnauthorized: false } as const;

export function getInitial(value: unknown): string {
  const first = trimToNull(value)?.charAt(0).toUpperCase() ?? "";
  return /^[A-Z0-9]$/.test(first) ? first : "A";
}

export function getUserAvatarFallbackUrl(user: AvatarSource = {}): string {
  const initial = getInitial(user.displayName || user.username);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%"><rect width="200" height="200" fill="#0d0d0d"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#fcfcfb" font-family="ui-sans-serif, system-ui, sans-serif" font-size="82" font-weight="600">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarUrl(user: AvatarSource = {}): string {
  return trimToNull(user.avatarUrl) ?? getUserAvatarFallbackUrl(user);
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

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShortDate(value?: string | null): string {
  const date = parseDate(value);
  return date ? ACCOUNT_DATE_FORMAT.format(date) : "";
}

export function formatCompactAge(value: string): string {
  const date = parseDate(value);
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

export function localDiaryDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
