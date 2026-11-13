import { tileVariants } from "@/design/components/surface-classes";
import type { AccountState, MovieLibraryState, SocialTab } from "./types";

export const INITIAL_ACCOUNT_STATE: AccountState = Object.freeze({
  account: null,
  error: null,
  isLoading: false,
});

export const USERNAME_PATTERN: RegExp =
  /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

export const PUBLIC_ACCOUNT_FIELDS =
  "id,username,display_name,avatar_url,background_url,bio,is_private,created_at";

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

export const LIBRARY_TABLES = {
  liked: "account_likes",
  watched: "account_watched",
  watchlist: "account_watchlist",
} as const;

export const EMPTY_MOVIE_LIBRARY: MovieLibraryState = Object.freeze({
  liked: false,
  watched: false,
  watchlist: false,
});

export const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const LIBRARY_UPSERT_OPTIONS = {
  onConflict: "account_id,media_type,tmdb_id",
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

export const SOCIAL_BUTTON = "min-w-[5.5rem]";

export const SOCIAL_ROW = tileVariants({ className: "w-full pr-2" });

export const FOLLOWS_URL = "/api/social/follows";
export const NOTIFICATIONS_URL = "/api/notifications";
export const SILENT_UNAUTHORIZED = { notifyOnUnauthorized: false } as const;
export const SILENT_READ = {
  notifyOnError: false,
  notifyOnUnauthorized: false,
} as const;

export const DIARY_INSERT_ERRORS: Record<string, string> = {
  DIARY_DATE_BEFORE_LATEST_ENTRY: "This movie is already logged on a later day",
  DIARY_DATE_IN_FUTURE: "You cannot log a movie in the future",
};
