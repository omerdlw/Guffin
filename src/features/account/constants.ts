import { PRIMARY, SURFACE_TILE } from "@/ui/tokens";
import type { AccountState, MovieLibraryState, SocialTab } from "./types";

export const INITIAL_ACCOUNT_STATE: AccountState = Object.freeze({
  account: null,
  error: null,
  isLoading: false,
});

export const USERNAME_PATTERN: RegExp =
  /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

export const PUBLIC_ACCOUNT_FIELDS =
  "id,username,display_name,avatar_url,banner_url,banner_position,background_url,bio,is_private,created_at";

export const DEFAULT_ACCOUNT_ICON = "solar:user-circle-bold";

export const NOTIFICATIONS_ICON = "solar:bell-bold";

export const NOTIFICATIONS_TITLE = "Notifications";

export const NOTIFICATIONS_ACTION_KEY = "social.notifications";

export const NOTIFICATIONS_ACTION_ORDER = -10;

export const SIGN_OUT_ACTION_KEY = "auth.sign-out";

export const SIGN_OUT_ACTION_ORDER = 30;

export const SOCIAL_EVENTS = Object.freeze({
  FOLLOW_CHANGE: "social:follow-change",
  INBOX_CHANGE: "social:inbox-change",
  NOTIFICATION_CHANGE: "social:notification-change",
} as const);

export const ACCOUNT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export const LAST_ACCOUNT_STORAGE_KEY = "GUFFIN_LAST_ACCOUNT";

export const MOVIE_LIBRARY_KINDS = ["liked", "watched", "watchlist"] as const;

export const EMPTY_MOVIE_LIBRARY: MovieLibraryState = Object.freeze({
  liked: false,
  watched: false,
  watchlist: false,
});

export const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const LIBRARY_UPSERT_OPTIONS = {
  onConflict: "account_id,tmdb_id",
  ignoreDuplicates: true,
};

export const COUNT_HEAD_OPTIONS = { count: "exact", head: true } as const;

export const LIBRARY_MARKS_MAX = 100;

export const NOTIFICATION_ICONS: Record<string, string> = {
  FOLLOW_ACCEPTED: "solar:user-check-bold",
  FOLLOW_REQUEST: "solar:user-plus-bold",
  MENTION: "solar:mention-circle-bold",
  NEW_FOLLOWER: "solar:user-plus-bold",
  SYSTEM_ANNOUNCEMENT: "solar:info-circle-bold",
};

export const NOTIFICATION_ICON_BUTTON =
  "center size-10 shrink-0 cursor-pointer rounded-inset select-none";

export const NOTIFICATION_TOOLBAR_BUTTON =
  "flex h-full shrink-0 cursor-pointer items-center rounded-full bg-transparent px-3.5 type-meta font-medium text-ink-body select-none hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink";

export const NOTIFICATION_BANNER_FADE =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.65) 70%, black 100%)";

export const NOTIFICATION_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

export const ACCOUNT_ENTRY_PATH = "/account";

export const SIGN_OUT_REDIRECT_DELAY_MS = 450;

export const REALTIME_DEBOUNCE_MS = 80;

export const INBOX_TYPES = new Set(["FOLLOW_REQUEST", "FOLLOW_ACCEPTED"]);

export const FALLBACK_BIO_TEXT = "No bio provided";

export const SETUP_DEFAULT_TITLE = "Account";

export const SOCIAL_TAB_LABELS: Record<SocialTab, string> = {
  followers: "Followers",
  following: "Following",
  inbox: "Follow Requests",
};

const SOCIAL_BUTTON =
  "center h-10 min-w-[6rem] shrink-0 rounded-inset px-4 type-meta font-medium select-none cursor-pointer disabled:cursor-not-allowed";

export const SOCIAL_PRIMARY_BUTTON = `${SOCIAL_BUTTON} ${PRIMARY} disabled:opacity-50`;

export const SOCIAL_SECONDARY_BUTTON = `${SOCIAL_BUTTON} text-ink-body ring-1 ring-edge-focus ring-inset hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink disabled:opacity-50`;

export const SOCIAL_MUTED_BUTTON = `${SOCIAL_BUTTON} text-ink-muted ring-1 ring-edge-hover ring-inset cursor-default`;

export const SOCIAL_ROW = `${SURFACE_TILE} w-full`;
