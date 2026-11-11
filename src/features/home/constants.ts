import type { PulseRow } from "./types";

export const COMPACT_NUMBER_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

export const RELEASE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export const RELATIVE_TIME_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
];

export const LOGLINE_LENGTH = 180;

export const LOGLINE_ENOUGH_LENGTH = 80;

export const CRAFT = [
  {
    icon: "solar:notebook-bold",
    text: "Keep a diary of every film you watch, with the day you saw it.",
    verb: "Log",
  },
  {
    icon: "solar:star-bold",
    text: "Half-star ratings that add up, film by film, to a portrait of your taste.",
    verb: "Rate",
  },
  {
    icon: "solar:pen-bold",
    text: "Write a line or an essay, then read what everyone else made of it.",
    verb: "Review",
  },
  {
    icon: "solar:bookmark-bold",
    text: "Save the films you mean to see, so choosing tonight takes a minute.",
    verb: "Watchlist",
  },
  {
    icon: "solar:list-bold",
    text: "Rank your favourites or gather a season. Lists are made to be shared.",
    verb: "Lists",
  },
  {
    icon: "solar:users-group-rounded-bold",
    text: "Follow friends and critics, and see what they watched last night.",
    verb: "Follow",
  },
] as const;

export const FALLBACK_ICON = "solar:clapperboard-play-bold";

export const ROW_ITEM_CLASS =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)]";

export const EMPTY_PULSE: PulseRow = {
  counts: { films: 0, lists: 0, logs: 0, members: 0, reviews: 0 },
  lists: [],
  popular: [],
  reviewers: [],
  reviews: [],
  rising: [],
  top_rated: [],
};

export const PULSE_KEY = "home:pulse";

export const PULSE_FRESH_MS = 5 * 60_000;

export const PULSE_KEEP_SECONDS = 7 * 24 * 60 * 60;

export const PULSE_LOCK_KEY = "home:pulse:lock";

export const PULSE_LOCK_SECONDS = 60;

export const PULSE_COLD_TIMEOUT_MS = 4000;

export const FEATURE_LIMIT = 5;

export const LOGGED_LIMIT = 18;

export const LOGGED_SCAN = 120;

export const LOGGED_SECONDS_PER_FILM = 5;

export const POPULAR_LIMIT = 12;

export const CANON_LIMIT = 10;

export const LIST_LIMIT = 6;

export const HERO_LIFT = "sm:-mt-64 lg:-mt-96 xl:-mt-112";

export const LEAD_REVIEW_LENGTH = 320;

export const FEATURE_SPARE_CANDIDATES = 2;

export const FEATURE_GENRE_LIMIT = 3;

export const REVIEW_LIMIT = 6;

export const PICKS_MIN_FILMS = 4;

export const PICKS_RANK_CONSTANT = 10;

export const ROW_LIMIT = 16;

export const SHOWING_LIMIT = 12;

export const RISING_LIMIT = 8;

export const MEMBER_LIMIT = 6;

export const SEED_LIMIT = 3;

export const THEATRES_MIN_VOTES = 25;

export const POSTER_SIZES =
  "(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 30vw";

export const TEXT_LINK_CLASS =
  "underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current";

export const CAPTION_CLASS =
  "flex min-h-5 min-w-0 items-center gap-1.5 type-meta font-medium text-ink-muted tabular-nums";
