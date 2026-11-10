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

export const JOIN_POINTS = [
  { role: "Log", text: "Every film you watch, with a rating and a date" },
  { role: "Write", text: "Reviews, and what others thought of the same film" },
  { role: "Follow", text: "Friends, and what they’re watching tonight" },
  { role: "Curate", text: "Lists worth sharing, ranked or not" },
];

export const FALLBACK_ICON = "solar:clapperboard-play-bold";

export const REEL_CYCLE_MS = 9000;

export const REEL_IMAGE_SIZE = "w1280";

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

/** Stale pulse stays servable for a week, so a visit is never the one to pay for a cold recount. */
export const PULSE_KEEP_SECONDS = 7 * 24 * 60 * 60;

export const PULSE_LOCK_KEY = "home:pulse:lock";

export const PULSE_LOCK_SECONDS = 60;

/** Cold-path ceiling: past this the page renders without the pulse instead of waiting on the database. */
export const PULSE_COLD_TIMEOUT_MS = 4000;

export const FEATURE_LIMIT = 5;

export const INDEX_LIMIT = 8;

/** The gate lifts further into the picture than a film page does, so the
 * whole strip clears the dock on the first screen. */
export const HERO_LIFT = "sm:-mt-64 lg:-mt-96 xl:-mt-112";

export const LEAD_REVIEW_LENGTH = 320;

export const RISING_AXIS_MIN = 2;

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

export const REVIEW_LINES = [
  ["100%", "100%", "100%", "64%"],
  ["100%", "100%", "42%"],
  ["100%", "100%", "100%", "78%"],
  ["100%", "100%", "100%", "30%"],
  ["100%", "86%"],
  ["100%", "100%", "100%", "56%"],
] as const;

export const RISING_TITLES = [
  "9rem",
  "7rem",
  "11rem",
  "8rem",
  "10rem",
  "6.5rem",
  "8.5rem",
  "9.5rem",
];

export const HERO_REEL_WIDTHS = ["7.5rem", "10rem", "6rem", "9rem", "8rem"];

export const LIST_TITLE_WIDTHS = [
  "11rem",
  "8.5rem",
  "13rem",
  "9.5rem",
  "12rem",
  "7.5rem",
];

export const MEMBER_NAME_WIDTHS = [
  "5.5rem",
  "4.5rem",
  "6rem",
  "5rem",
  "6.5rem",
  "4.75rem",
];

export const JOIN_POINT_LINES = [["100%", "34%"], ["96%"], ["92%"], ["88%"]];

export const POSTER_SIZES =
  "(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 30vw";

export const TEXT_LINK_CLASS =
  "underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current";

export const CAPTION_CLASS =
  "flex min-h-5 min-w-0 items-center gap-1.5 type-meta font-medium text-ink-muted tabular-nums";
