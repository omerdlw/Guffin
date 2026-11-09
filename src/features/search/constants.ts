import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import { USER_MESSAGES } from "@omerdlw/base-framework/utils";
import { TV_ENABLED } from "@/lib/env";
import type {
  SearchFailure,
  SearchFailureCode,
  SearchScope,
  SearchType,
} from "./types";

export const SEARCH_TYPES = [
  "movies",
  "shows",
  "people",
  "users",
  "lists",
  "reviews",
] as const;

/** The kinds this build searches: shows only while the TV flag is on. */
export const ACTIVE_SEARCH_TYPES: readonly SearchType[] = TV_ENABLED
  ? SEARCH_TYPES
  : SEARCH_TYPES.filter((kind) => kind !== "shows");

export const SEARCH_MIN_QUERY_LENGTH = 2;

export const SEARCH_MAX_QUERY_LENGTH = 100;

export const SEARCH_DEBOUNCE_MS = 250;

export const SEARCH_CACHE_LIMIT = 80;

export const SEARCH_ENDPOINTS: Readonly<Record<SearchType, string>> = {
  lists: "/api/search/lists",
  movies: "/api/search/movies",
  people: "/api/search/people",
  reviews: "/api/search/reviews",
  shows: "/api/search/shows",
  users: "/api/search/users",
};

export const COMMUNITY_SEARCH_TYPES: readonly SearchType[] = [
  "users",
  "lists",
  "reviews",
];

export const SEARCH_COMMUNITY_LIMIT = 12;

export const SEARCH_SCOPE_ITEMS: readonly {
  key: SearchScope;
  label: string;
}[] = (
  [
    { key: "all", label: "All" },
    { key: "movies", label: "Movies" },
    { key: "shows", label: "Shows" },
    { key: "people", label: "People" },
    { key: "users", label: "Users" },
    { key: "lists", label: "Lists" },
    { key: "reviews", label: "Reviews" },
  ] as const
).filter(({ key }) => key === "all" || ACTIVE_SEARCH_TYPES.includes(key));

export const SEARCH_NOUNS: Readonly<Record<SearchScope, string>> = {
  all: "results",
  lists: "lists",
  movies: "movies",
  people: "people",
  reviews: "reviews",
  shows: "shows",
  users: "users",
};

export const SEARCH_EMPTY_HINTS: Readonly<Record<SearchScope, string>> = {
  all: "Check the spelling, or add a year: dune 1984",
  lists: "Try fewer words from the list's title",
  movies: "Check the spelling, or add a year: dune 1984",
  people: "Check the spelling of the name",
  reviews: "Try a film's title or a few words from a review",
  shows: "Check the spelling, or add a year: shogun 2024",
  users: "Try a username or a display name",
};

export const SEARCH_GROUP_LABELS: Readonly<Record<SearchType, string>> = {
  lists: "Lists",
  movies: "Movies",
  people: "People",
  reviews: "Reviews",
  shows: "Shows",
  users: "Users",
};

export const SEARCH_PER_PAGE: Readonly<Record<SearchType, number>> = {
  lists: 3,
  movies: 8,
  people: 3,
  reviews: 3,
  shows: 8,
  users: 3,
};

export const SEARCH_OVERVIEW: Readonly<Record<SearchType, number>> = {
  lists: 1,
  movies: 4,
  people: 1,
  reviews: 1,
  shows: 4,
  users: 1,
};

export const SEARCH_OVERVIEW_LEAD: Readonly<Record<SearchType, number>> = {
  lists: 2,
  movies: 4,
  people: 3,
  reviews: 2,
  shows: 4,
  users: 3,
};

export const SEARCH_FALLBACK_MESSAGE =
  "Search is unavailable right now. Please try again in a moment";

export const SEARCH_ICON = "solar:magnifer-linear";

export const SEARCH_CLOSE_ICON = "solar:close-bold";

export const SEARCH_ACTION_KEY = "search.open";

export const SEARCH_ACTION_ORDER = -20;

export const MATCH_SCORE = Object.freeze({
  exact: 1,
  prefix: 0.85,
  acronym: 0.82,
  partialPrefix: 0.8,
  phrase: 0.6,
  phraseStart: 0.55,
  allWords: 0.4,
  substring: 0.35,
  coverage: 0.1,
  strong: 0.85,
  weak: 0.55,
});

export const ARTICLE_PATTERN = /^(?:the|a|an) (?=\S)/;

export const ACRONYM_PATTERN = /^[\p{L}\p{N}]{2,8}$/u;

export const SUBTITLE_PATTERN = /\s*(?::|\s[-–—]\s)/;

export const SEQUEL_PATTERN =
  / (?:(?:vol(?:ume)?|part|chapter) )?(?:\d+|[ivx]+)$/;

export const FRANCHISE_PATTERN = / and .*$/;

export const RENOWN_VOTES = 20_000;

export const RENOWN_WEIGHT = Object.freeze({
  follows: 1_000,
  likes: 300,
  movie: 100,
  person: 30,
  show: 100,
});

export const TMDB_SEARCH_TYPES: ReadonlySet<SearchType> = new Set([
  "movies",
  "shows",
  "people",
]);

export const DISTANT_MATCH = 0.6;

export const RESULT_POSTER_GRID = "grid grid-cols-4 gap-2.5";

export const RESULT_ROW_LIST = "flex flex-col gap-1";

export const SEARCH_REGISTRATION = {
  priority: 1000,
  source: REGISTRY_SOURCES.DYNAMIC,
} as const;

export const RESULT_THUMB_WIDTHS = ["w185"] as const;

export const STILL_TRANSITION = { duration: 0 };

export const HIGHLIGHT_HALO = 4;

export const CATALOG_PAGES = {
  "popularity.desc": 5,
  "vote_count.desc": 25,
} as const;

export const CATALOG_MATCH_LIMIT = 8;

export const CATALOG_MIN_FILMS = 100;

export const CATALOG_LIFETIME_MS = 6 * 60 * 60 * 1000;

export const INVALID_QUERY_FAILURE: SearchFailure = {
  code: "invalid_query",
  message: "Enter a valid search term",
};

export const UNAVAILABLE_FAILURE: SearchFailure = {
  code: "unavailable",
  message: SEARCH_FALLBACK_MESSAGE,
};

export const COMMUNITY_CANDIDATES = SEARCH_COMMUNITY_LIMIT * 2;

export const FAILURE_MESSAGES: Record<SearchFailureCode, string> = {
  aborted: "The search was cancelled",
  invalid_query: "Enter a valid search term",
  rate_limited: USER_MESSAGES.rateLimited,
  unavailable: SEARCH_FALLBACK_MESSAGE,
};

export const FAME_WEIGHT = 0.5;

export const ORDER_WEIGHT = 0.15;

export const YEAR_BONUS = 0.4;

export const NO_PICTURE_PENALTY = 0.2;

export const CREDIT_MATCH = 0.75;

export const CREDIT_FILMS = 8;

export const STANDOUT_RENOWN = 0.45;

export const STANDOUT_LEAD = 1.5;

export const FAILURE_STATUS: Record<SearchFailureCode, number> = {
  aborted: 499,
  invalid_query: 400,
  rate_limited: 429,
  unavailable: 503,
};

export const PUBLIC_CACHE_CONTROL =
  "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";

export const PRIVATE_CACHE_CONTROL = "private, max-age=30";

export const FAILURE_CODE_BY_TMDB_KIND: Readonly<
  Record<string, SearchFailureCode>
> = {
  invalid_request: "invalid_query",
  rate_limited: "rate_limited",
};

export const FAILURE_CODE_BY_STATUS: Readonly<
  Record<number, SearchFailureCode>
> = {
  400: "invalid_query",
  429: "rate_limited",
};
