import { MOVIE_REVIEW_SORTS } from "@/features/reviews/constants";
import type { MovieReviewSort } from "@/features/reviews/types";
import { type MediaCardAspect } from "@/design/components/media-card";
import { SURFACE_TILE_END, tileVariants } from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import { CAROUSEL_ITEM, CAROUSEL_WIDE_ITEM } from "@/design/foundations/layout";
import type { GalleryTab, ProviderCategory } from "./types";

export const MOVIE_FEATURED_PEOPLE = 8;

export const MOVIE_COMPACT_PEOPLE = 3;

export const MOVIE_TAG_LIMIT = 10;

export const MOVIE_TAG_MAX_LENGTH = 28;

export const MOVIE_RECOMMENDATION_LIMIT = 12;

export const MOVIE_WRITER_LIMIT = 10;

export const MOVIE_CERTIFICATION_REGION = "US";

export const MOVIE_FALLBACK_ICON = "solar:clapperboard-play-bold";

export const TAGLINE_TYPE = "type-body sm:type-copy";

export const TAGLINE_CLASS = `${TAGLINE_TYPE} font-medium tracking-tagline uppercase text-balance`;

export const AFTER_TAGLINE = "mt-4";

export const WRITING_JOBS: ReadonlySet<string> = new Set([
  "Screenplay",
  "Writer",
  "Story",
  "Novel",
  "Author",
]);

export const DOCK_DIRECTOR_LIMIT = 2;

export const RELEASE_TYPE_PRIORITY = [3, 2, 4, 5, 6, 1];

export const MOVIE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export const MOVIE_MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  notation: "compact",
  style: "currency",
});

export const CREW_JOB_PRIORITY = [
  "Director",
  "Screenplay",
  "Writer",
  "Story",
  "Producer",
  "Executive Producer",
  "Director of Photography",
  "Original Music Composer",
  "Editor",
  "Production Design",
  "Costume Design",
];

export const REGION_CODE_PATTERN = /^[A-Z]{2}$/;

export const GALLERY_TABS: Record<
  GalleryTab,
  {
    aspect: MediaCardAspect;
    item: string;
    label: string;
    noun: string;
    sizes: string;
  }
> = {
  backdrops: {
    aspect: "video",
    item: CAROUSEL_WIDE_ITEM,
    label: "Backdrops",
    noun: "scene",
    sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
  },
  posters: {
    aspect: "poster",
    item: CAROUSEL_ITEM,
    label: "Posters",
    noun: "poster",
    sizes: "(min-width: 768px) 160px, 30vw",
  },
};

export const GALLERY_TAB_ORDER: readonly GalleryTab[] = [
  "backdrops",
  "posters",
];

export const GALLERY_REACH_STEP = 18;

export const THUMBNAIL_WIDTHS = {
  gallery: {
    backdrops: ["w300", "w780", "w1280"],
    posters: ["w185", "w342", "w500"],
  },
  wall: {
    backdrops: ["w300", "w780"],
    posters: ["w185", "w342"],
  },
} as const;

export const REEL_IMAGE_SIZE = "w1280";

export const STILL_BADGE_RUNG = 1;

export const REVIEW_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const DIGEST_LIGHTS = 6;

export const DIGEST_SHOWN = 4;

const SORT_LABELS: Record<MovieReviewSort, string> = {
  likes_asc: "Least liked",
  likes_desc: "Most liked",
  newest: "Newest",
  oldest: "Oldest",
  rating_asc: "Lowest rated",
  rating_desc: "Highest rated",
};

export const REVIEW_SORT_OPTIONS = MOVIE_REVIEW_SORTS.map((sort) => ({
  label: SORT_LABELS[sort.value],
  value: sort.value,
}));

export const REVIEW_SELECT_CLASS = "min-w-0 flex-1 sm:w-44 sm:flex-none";

export const SKELETON_FACT_WIDTHS = [
  ["3.5rem", "7rem"],
  ["2.5rem", "9rem"],
  ["4.5rem", "6.5rem"],
  ["3.5rem", "5.5rem"],
  ["4.5rem", "7.5rem"],
  ["3rem", "1.25rem"],
  ["4rem", "3.5rem"],
  ["3.25rem", "4.5rem"],
  ["3.5rem", "3rem"],
  ["4rem", "4.5rem"],
] as const;

export const SKELETON_REVIEW_LINES = [
  ["100%", "100%", "38%"],
  ["100%", "72%"],
  ["100%", "100%", "100%", "54%"],
] as const;

export const POSTER_LINK_WIDTHS = ["w185", "w342"] as const;

export const COLLECTION_ICONS = {
  like: { off: "solar:heart-linear", on: "solar:heart-bold" },
  watched: { off: "solar:eye-linear", on: "solar:eye-bold" },
  watchlist: { off: "solar:bookmark-linear", on: "solar:bookmark-bold" },
  diary: { off: "solar:notebook-linear", on: "solar:notebook-bold" },
  list: { off: "solar:folder-open-linear", on: "solar:folder-open-bold" },
  providers: { off: "solar:tv-linear", on: "solar:tv-bold" },
  awards: { off: "solar:cup-star-linear", on: "solar:cup-star-bold" },
};

export const MAX_VISIBLE_PEOPLE = 2;

export const MAX_VISIBLE_GENRES = 3;

export const MAX_VISIBLE_TAGS = 2;

export const COMPACT_NUMBER_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

export const PROVIDER_CATEGORIES: readonly {
  icon: string;
  key: ProviderCategory;
  label: string;
}[] = [
  { icon: "solar:play-bold", key: "stream", label: "Stream" },
  { icon: "solar:tag-price-bold", key: "rent", label: "Rent" },
  { icon: "solar:bag-check-bold", key: "buy", label: "Buy" },
  { icon: "solar:gift-bold", key: "free", label: "Free" },
];

export const FALLBACK_REGION = "US";

export const PROVIDER_SEARCH_URLS: readonly [RegExp, (q: string) => string][] =
  [
    [/netflix/i, (q) => `https://www.netflix.com/search?q=${q}`],
    [/prime|amazon/i, (q) => `https://www.primevideo.com/search?phrase=${q}`],
    [/apple|itunes/i, (q) => `https://tv.apple.com/search?term=${q}`],
    [
      /google play/i,
      (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
    ],
    [
      /youtube/i,
      (q) => `https://www.youtube.com/results?search_query=${q}+full+movie`,
    ],
    [/disney/i, (q) => `https://www.disneyplus.com/search?q=${q}`],
    [/\bmax\b|hbo/i, (q) => `https://play.max.com/search?q=${q}`],
    [/paramount/i, (q) => `https://www.paramountplus.com/search/?query=${q}`],
    [/peacock/i, (q) => `https://www.peacocktv.com/search?q=${q}`],
    [/hulu/i, (q) => `https://www.hulu.com/search?q=${q}`],
    [/mubi/i, (q) => `https://mubi.com/search?query=${q}`],
    [/tubi/i, (q) => `https://tubitv.com/search/${q}`],
    [/pluto/i, (q) => `https://pluto.tv/search/details?q=${q}`],
    [/crunchyroll/i, (q) => `https://www.crunchyroll.com/search?q=${q}`],
  ];

export const PROVIDER_TILE_CLASS = cn(
  tileVariants(),
  SURFACE_TILE_END,
  "group/tile relative isolate text-ink-body hover:text-ink focus-visible:text-ink",
);
