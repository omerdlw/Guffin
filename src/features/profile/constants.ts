import type { MediaType } from "@/features/catalog/types";
import { inputVariants } from "@/design/components/input";
import { cn } from "@/design/foundations/cn";
import { TONE } from "@/design/foundations/tones";
import type {
  AccountHeader,
  ActivityGroup,
  Copy,
  FilterOption,
  LibraryCounts,
  MediaKind,
  OverviewRow,
  TileSource,
} from "./types";

export const FAVORITES_MAX = 5;

export const MEDIA_PAGE_SIZE = 36;

export const LIST_PAGE_SIZE = 18;

export const REVIEW_PAGE_SIZE = 20;

export const ACTIVITY_PAGE_SIZE = 30;

export const MEDIA_SORTS = [
  { label: "Recently added", value: "added_desc" },
  { label: "Added first", value: "added_asc" },
  { label: "Newest release", value: "release_desc" },
  { label: "Oldest release", value: "release_asc" },
  { label: "Title A–Z", value: "title_asc" },
  { label: "Title Z–A", value: "title_desc" },
] as const satisfies readonly FilterOption[];

export const LIST_ITEM_SORTS = [
  { label: "List order", value: "position" },
  ...MEDIA_SORTS,
] as const satisfies readonly FilterOption[];

export const FILTER_GENRES: readonly { id: number; label: string }[] = [
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14, label: "Fantasy" },
  { id: 36, label: "History" },
  { id: 27, label: "Horror" },
  { id: 10402, label: "Music" },
  { id: 9648, label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Science Fiction" },
  { id: 53, label: "Thriller" },
  { id: 10752, label: "War" },
  { id: 37, label: "Western" },
];

export const FILTER_DECADES: readonly number[] = Array.from(
  { length: 11 },
  (_, index) => 2020 - index * 10,
);

export const MEDIA_FILTERS = [
  {
    allLabel: "Any genre",
    key: "genre",
    options: FILTER_GENRES.map((genre) => ({
      label: genre.label,
      value: String(genre.id),
    })),
  },
  {
    allLabel: "Any decade",
    key: "decade",
    options: FILTER_DECADES.map((decade) => ({
      label: `${decade}s`,
      value: String(decade),
    })),
  },
];

export const LIST_SORTS = [
  { label: "Recently updated", value: "updated_desc" },
  { label: "Newest", value: "created_desc" },
  { label: "Oldest", value: "created_asc" },
  { label: "Most films", value: "items_desc" },
  { label: "Most liked", value: "likes_desc" },
  { label: "Title A–Z", value: "title_asc" },
] as const satisfies readonly FilterOption[];

export const REVIEW_SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest rated", value: "rating_desc" },
  { label: "Lowest rated", value: "rating_asc" },
  { label: "Most liked", value: "likes_desc" },
] as const satisfies readonly FilterOption[];

export const REVIEW_KINDS = [
  { label: "Reviews and ratings", value: "all" },
  { label: "Written reviews", value: "written" },
  { label: "Ratings only", value: "ratings" },
] as const satisfies readonly FilterOption[];

export const ACTIVITY_GROUPS = [
  { label: "Everything", value: "all" },
  { label: "Diary", value: "diary" },
  { label: "Watched", value: "watched" },
  { label: "Watchlist", value: "watchlist" },
  { label: "Likes", value: "likes" },
  { label: "Reviews and ratings", value: "reviews" },
  { label: "Lists", value: "lists" },
  { label: "Follows", value: "follows" },
] as const satisfies readonly FilterOption[];

export const ACTIVITY_TYPES: Record<ActivityGroup, readonly string[]> = {
  all: [],
  diary: [
    "WATCH_DIARY_LOGGED",
    "WATCH_DIARY_REWATCHED",
    "EPISODE_WATCHED",
    "SEASON_WATCHED",
  ],
  follows: ["FOLLOW_CREATED"],
  likes: ["LIKED_ADDED"],
  lists: ["LIST_CREATED", "LIST_LIKED", "LIST_COMMENTED"],
  reviews: ["REVIEW_PUBLISHED", "RATING_LOGGED", "REVIEW_LIKED"],
  watched: ["WATCHED_ADDED", "SHOW_STARTED", "SHOW_COMPLETED"],
  watchlist: ["WATCHLIST_ADDED"],
};

export const ACTIVITY_SUMMARY_WEEKS = 104;

export const ACTIVITY_KINDS: Record<string, string> = {
  EPISODE_WATCHED: "Episodes",
  FOLLOW_CREATED: "Follow",
  SEASON_WATCHED: "Season",
  SHOW_COMPLETED: "Finished",
  SHOW_STARTED: "Started",
  LIKED_ADDED: "Like",
  LIST_COMMENTED: "Comment",
  LIST_CREATED: "List",
  LIST_LIKED: "List like",
  RATING_LOGGED: "Rating",
  REVIEW_LIKED: "Review like",
  REVIEW_PUBLISHED: "Review",
  WATCH_DIARY_LOGGED: "Diary",
  WATCH_DIARY_REWATCHED: "Rewatch",
  WATCHED_ADDED: "Watched",
  WATCHLIST_ADDED: "Watchlist",
};

export const ACTIVITY_TONES: Record<string, string> = {
  FOLLOW_CREATED: "text-ink-body",
  LIKED_ADDED: "text-liked",
  LIST_COMMENTED: "text-ink-body",
  LIST_CREATED: "text-listed",
  LIST_LIKED: "text-liked",
  RATING_LOGGED: "text-rated",
  REVIEW_LIKED: "text-liked",
  REVIEW_PUBLISHED: "text-rated",
  WATCH_DIARY_LOGGED: "text-watched",
  WATCH_DIARY_REWATCHED: "text-watched",
  WATCHED_ADDED: "text-watched",
  WATCHLIST_ADDED: "text-listed",
};

export const ACTIVITY_SORTS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
] as const satisfies readonly FilterOption[];

export const MEDIA_SORT_COLUMNS = {
  added_asc: ["added", true],
  added_desc: ["added", false],
  release_asc: ["release_date", true],
  release_desc: ["release_date", false],
  title_asc: ["title", true],
  title_desc: ["title", false],
} as const;

export const LIST_SORT_COLUMNS = {
  created_asc: ["created_at", true],
  created_desc: ["created_at", false],
  items_desc: ["items_count", false],
  likes_desc: ["likes_count", false],
  title_asc: ["title", true],
  updated_desc: ["updated_at", false],
} as const;

export const REVIEW_SORT_COLUMNS = {
  likes_desc: ["likes_count", false],
  newest: ["updated_at", false],
  oldest: ["updated_at", true],
  rating_asc: ["rating", true],
  rating_desc: ["rating", false],
} as const;

export const LIST_PREVIEW_POSTERS = 5;

export const DIARY_MONTH_LIMIT = 400;

export const LIST_COMMENTS_LIMIT = 50;

export const PALETTE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

export const OVERVIEW_WATCHLIST = 5;

export const PROFILE_GRID =
  "grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6";

export const PROFILE_ROW =
  "grid-cols-5 gap-fib-2 sm:grid-cols-5 sm:gap-fib-3 md:grid-cols-5 lg:grid-cols-5";

export const POSTER_SIZES =
  "(min-width: 1024px) 16vw, (min-width: 640px) 22vw, 30vw";

export const DAY_MS = 86_400_000;

export const CALENDAR_CELL = "size-2.5 rounded-mark";

export const CALENDAR_LEVELS = [
  "bg-fill",
  "bg-fill-active",
  "bg-ink-faint",
  "bg-ink-muted",
  "bg-ink-lead",
];

export const CALENDAR_MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

export const ACTIVITY_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export const ACTIVITY_ICONS: Record<string, string> = {
  FOLLOW_CREATED: "solar:user-plus-bold",
  LIKED_ADDED: "solar:heart-bold",
  LIST_COMMENTED: "solar:chat-round-bold",
  LIST_CREATED: "solar:list-bold",
  LIST_LIKED: "solar:heart-bold",
  RATING_LOGGED: "solar:star-bold",
  REVIEW_LIKED: "solar:heart-bold",
  REVIEW_PUBLISHED: "solar:chat-round-bold",
  WATCH_DIARY_LOGGED: "solar:calendar-mark-bold",
  WATCH_DIARY_REWATCHED: "solar:restart-bold",
  WATCHED_ADDED: "solar:eye-bold",
  WATCHLIST_ADDED: "solar:bookmark-bold",
};

export const STRONG_CLASS =
  "font-medium text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current";

export const STAT_LABEL_CLASS = `${TONE.label} text-ink-body`;

export const STAT_AFTER_CLASS = `${TONE.label} tabular-nums`;

export const STAT_CELL_CLASS =
  "group/stat flex w-full flex-col items-center gap-1 px-1";

export const DIARY_DIGEST_MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

export const PEOPLE_COLUMNS = 6;

export const POSTER_STACK_SLOTS = 5;

export const STAR_COUNT = 5;

export const ANY_OPTION = "__any__";

export const SEARCH_SETTLE_MS = 280;

export const FILTER_BAR_LOOK = {
  form: "relative col-span-full min-w-0 md:flex-1",
  input: cn(inputVariants(), "h-10 w-full rounded-full pr-3 pl-10 type-body"),
  reset: "col-span-full px-3 font-semibold uppercase md:justify-start",
  root: "mb-5 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center",
  select: "min-w-0 md:w-44 md:flex-none lg:w-48",
  share: "md:w-auto md:flex-1 lg:w-48 lg:flex-none",
} as const;

export const PAGE_STEP_CLASS =
  "center size-9 shrink-0 rounded-full type-meta font-semibold ring-1 ring-inset";

export const PAGE_IDLE_CLASS =
  "text-ink-body ring-edge hover:text-ink focus-visible:text-ink";

export const PAGE_CURRENT_CLASS = "text-ink ring-edge-focus";

export const LIBRARY_KIND_BY_SOURCE = {
  likes: "liked",
  watched: "watched",
  watchlist: "watchlist",
} as const;

export const SECTION_TABS = [
  { key: null, label: "Profile" },
  { key: "activity", label: "Activity" },
  { key: "watched", label: "Films" },
  { key: "diary", label: "Diary" },
  { key: "reviews", label: "Reviews" },
  { key: "watchlist", label: "Watchlist" },
  { key: "lists", label: "Lists" },
  { key: "likes", label: "Likes" },
  { key: "progress", label: "Progress" },
] as const;

/** Tabs that exist only while the TV flag is on. */
export const TV_SECTION_TABS: ReadonlySet<string> = new Set(["progress"]);

/** How many shows each status section of the progress page holds. */
export const PROGRESS_SECTION_LIMIT = 60;

export const PROGRESS_ORDER = [
  "watching",
  "paused",
  "completed",
  "dropped",
] as const;

export const TILE_ACTION_LABELS: Record<TileSource["kind"], string> = {
  likes: "likes",
  list: "this list",
  watched: "watched",
  watchlist: "your watchlist",
};

export const DIARY_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
  weekday: "short",
});

export const DIARY_COLUMNS =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_7rem_4.5rem_4.5rem_2.5rem] sm:gap-x-4";

export const DIARY_HEAD_CLASS = `${TONE.label} text-ink-muted`;

export const DEFAULT_DISPLAY_NAME = "Account";

export const JOIN_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export const AVATAR_CLASSES =
  "relative flex size-fib-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-veil type-display-xs font-semibold text-ink ring-2 ring-edge-hover select-none";

export const PROFILE_CONTAINER_CLASS =
  "mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8";

export const BIO_CLAMP_CLASS =
  "line-clamp-3 [mask-image:linear-gradient(#000,#000),linear-gradient(to_left,transparent_5.5rem,#000_8rem)] [mask-position:top,bottom] [mask-repeat:no-repeat] [mask-size:100%_calc(100%-20px),100%_20px]";

export const LIST_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const EMPTY_LIBRARY_COUNTS: LibraryCounts = Object.freeze({
  diary: 0,
  likes: 0,
  lists: 0,
  reviews: 0,
  watched: 0,
  watchlist: 0,
});

export const MEDIA_TABLES = {
  likes: "account_likes",
  watched: "account_watched",
  watchlist: "account_watchlist",
} as const;

export const MOVIE_COLUMNS = "tmdb_id, title, poster_path, release_date";

export const PROFILE_LIST_COLUMNS =
  "id, slug, title, description, is_private, is_ranked, items_count, likes_count, reviews_count, updated_at";

export const PROFILE_REVIEW_COLUMNS =
  "id, tmdb_id, media_type, title, poster_path, backdrop_path, release_date, content, rating, is_spoiler, likes_count, created_at, updated_at";

export const PROFILE_ACTIVITY_COLUMNS =
  "id, type, tmdb_id, media_type, payload, created_at, target:accounts!account_activity_target_account_id_fkey(username, display_name)";

export const EMPTY_OVERVIEW: OverviewRow = {
  activity: [],
  activity_days: null,
  diary: [],
  favorites: [],
  following: [],
  lists: [],
  popular_reviews: [],
  rating_spread: null,
  recent_reviews: [],
  stats: null,
  watched: [],
  watchlist: [],
};

export const EMPTY_HEADER: AccountHeader = {
  followersCount: 0,
  followingCount: 0,
  followStatus: null,
  library: null,
  mutual: null,
};

export const PALETTE_VERSION = "account-ambient";

export const PALETTE_TIMEOUT_MS = 3_000;

export const PALETTE_MAX_BYTES = 8 * 1024 * 1024;

export const TMDB_IMAGE =
  /^(https:\/\/image\.tmdb\.org\/t\/p\/)[^/]+(\/[^/]+)$/i;

export const PALETTE_BUDGET_MS = 600;

export const DOCK_ACTION_ORDER = 10;

export const SHELL_SETTLE_RUNG = 1;

export const SKELETON_TABS = [
  { key: null, width: 71 },
  { key: "activity", width: 78 },
  { key: "watched", width: 65 },
  { key: "diary", width: 64 },
  { key: "reviews", width: 83 },
  { key: "watchlist", width: 89 },
  { key: "lists", width: 61 },
  { key: "likes", width: 64 },
] as const;

export const SKELETON_STATS = [
  "2.25rem",
  "3.8rem",
  "2.1rem",
  "4.3rem",
  "4.475rem",
];

export const SOLID_TINT = "color-mix(in srgb, var(--ink) 7%, var(--page))";

export const SKELETON_RECENT_REVIEWS: Copy[] = [
  { phone: ["100%", "100%", "40%"], widths: ["100%", "62%"] },
  { phone: ["100%", "52%"], widths: ["84%"] },
  { phone: ["100%", "60%"], widths: ["91%"] },
];

export const SKELETON_POPULAR_REVIEWS: Copy[] = [
  { phone: ["100%", "100%", "100%", "30%"], widths: ["100%", "48%"] },
  { phone: ["100%", "100%", "100%", "55%"], widths: ["100%", "76%"] },
  { phone: ["100%", "100%", "45%"], widths: ["100%", "35%"] },
];

export const SKELETON_PAGE_REVIEWS: Copy[] = Array.from(
  { length: 20 },
  (_, index): Copy =>
    [
      { widths: [] },
      { phone: ["100%", "38%"], widths: ["84%"] },
      { widths: [] },
      { widths: [] },
      { widths: [] },
      { phone: ["100%", "20%"], widths: ["62%"] },
      { widths: [] },
      { phone: ["100%", "100%", "64%"], widths: ["100%", "46%"] },
    ][index % 8]!,
);

export const SKELETON_DIARY_TITLES = [
  "8rem",
  "11rem",
  "6.5rem",
  "9.5rem",
  "12rem",
  "7rem",
  "10rem",
  "8.5rem",
  "13rem",
  "6rem",
];

export const SKELETON_SPREAD = [6, 10, 18, 26, 44, 62, 88, 70, 38, 24];

export const SKELETON_WEEKS = 26;

export const SKELETON_FEED: Copy[] = [
  { phone: ["92%"], widths: ["100%", "48%"] },
  { phone: ["100%", "30%"], widths: ["100%", "62%"] },
  { widths: ["86%"] },
  { phone: ["88%"], widths: ["100%", "40%"] },
  { widths: ["74%"] },
];

export const SKELETON_ACTIVITY_PAGE = 30;

export const SKELETON_LEDGER = [
  { day: true, title: "9rem" },
  { day: false, title: "12rem" },
  { day: true, title: "7rem" },
  { day: true, title: "10.5rem" },
  { day: false, title: "8rem" },
  { day: true, title: "11rem" },
  { day: true, title: "6.5rem" },
  { day: false, title: "9.5rem" },
  { day: true, title: "13rem" },
  { day: true, title: "8.5rem" },
];

export const SKELETON_LIST_ROWS = [
  { description: ["64%"], title: "13rem" },
  { description: ["92%"], title: "9rem" },
  { description: [], title: "15rem" },
  { description: ["48%"], title: "11rem" },
  { description: ["72%"], title: "8rem" },
] as const;

export const SKELETON_COMMENTS = [["78%"], ["54%"]] as const;

export const SKELETON_MEDIA_SECTIONS = new Set([
  "likes",
  "watched",
  "watchlist",
]);

export const OVERVIEW_RECENT = 5;

export const OVERVIEW_REVIEWS = 3;

export const OVERVIEW_POPULAR = 3;

export const OVERVIEW_DIARY = 10;

export const OVERVIEW_LISTS = 3;

export const OVERVIEW_FOLLOWING = 18;

export const OVERVIEW_ACTIVITY = 5;

export const VIEW_MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export const MEDIA_VIEW_KINDS: Record<
  MediaKind,
  Record<MediaType, { empty: string; emptyOwn: string; icon: string }>
> = {
  likes: {
    movie: {
      empty: "No liked movies yet",
      emptyOwn:
        "Movies you like show up here. Pin up to five as your favorites.",
      icon: "solar:heart-bold",
    },
    tv: {
      empty: "No liked shows yet",
      emptyOwn:
        "Shows you like show up here. Pin up to five as your favorites.",
      icon: "solar:heart-bold",
    },
  },
  watched: {
    movie: {
      empty: "No watched movies yet",
      emptyOwn: "Movies you mark as watched show up here",
      icon: "solar:eye-bold",
    },
    tv: {
      empty: "No finished shows yet",
      emptyOwn: "Shows you finish show up here",
      icon: "solar:eye-bold",
    },
  },
  watchlist: {
    movie: {
      empty: "The watchlist is empty",
      emptyOwn: "Movies you save for later show up here",
      icon: "solar:bookmark-bold",
    },
    tv: {
      empty: "The watchlist is empty",
      emptyOwn: "Shows you save for later show up here",
      icon: "solar:bookmark-bold",
    },
  },
};

export const WATCHING_SHELF_LIMIT = 12;
