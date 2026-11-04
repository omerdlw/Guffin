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

export const JOIN_POINTS = [
  {
    icon: "solar:notebook-bookmark-bold",
    text: "Log every film you watch, with a rating and a date",
  },
  {
    icon: "solar:pen-new-square-bold",
    text: "Write reviews and read what others thought",
  },
  {
    icon: "solar:users-group-rounded-bold",
    text: "Follow friends and see what they’re watching",
  },
  {
    icon: "solar:widget-bold",
    text: "Make lists worth sharing, ranked or not",
  },
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

export const PULSE_KEEP_SECONDS = 60 * 60;

export const FEATURE_LIMIT = 5;

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

export const CAPTION_CLASS =
  "flex min-h-5 min-w-0 items-center gap-1.5 type-meta font-medium text-ink-muted tabular-nums";
