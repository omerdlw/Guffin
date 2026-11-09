import type { PersonExternalIds } from "@/lib/tmdb/shared";
import { CAROUSEL_ITEM, CAROUSEL_WIDE_ITEM } from "@/design/foundations/layout";
import type {
  FilmographySort,
  GalleryTab,
  GalleryView,
  PersonViewKey,
} from "./types";

export const PERSON_FILMOGRAPHY_PREVIEW = 24;

export const PERSON_GALLERY_LIMIT = 20;

export const PERSON_BACKDROP_LIMIT = 12;

export const PERSON_BIO_CLAMP_LENGTH = 300;

export const PERSON_BACKDROP_MIN_VOTES = 50;

export const PERSON_BIO_EXCERPT = 360;

export const PERSON_ALIAS_VISIBLE = 2;

export const PERSON_CAREER_MIN_YEARS = 12;

export const PERSON_KNOWN_FOR = 2;

export const PERSON_FALLBACK_ICON = "solar:user-bold";

export const PERSON_DEFAULT_SORT: FilmographySort = "popularity";

export const PERSON_LINKS_CLASS = "-my-2.5 -mr-2 flex shrink-0 gap-1";

export const FILMOGRAPHY_GRID_CLASS =
  "grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-4";

export const PERSON_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export const DEPARTMENT_ROLES: Readonly<Record<string, string>> = {
  Acting: "Actor",
  Directing: "Director",
  Writing: "Writer",
  Production: "Producer",
  Editing: "Editor",
  Camera: "Cinematographer",
  Sound: "Sound",
  Art: "Art",
  "Costume & Make-Up": "Costume & Make-Up",
  "Visual Effects": "Visual Effects",
  Lighting: "Lighting",
  Creator: "Creator",
  Crew: "Crew",
};

export const SOCIAL_SOURCES: readonly {
  icon: string;
  id: (ids: PersonExternalIds) => string | null;
  key: string;
  label: string;
  pattern: RegExp;
  url: (id: string) => string;
}[] = [
  {
    icon: "cib:imdb",
    id: (ids) => ids.imdbId,
    key: "imdb",
    label: "IMDb",
    pattern: /^nm\d+$/,
    url: (id) => `https://www.imdb.com/name/${id}/`,
  },
  {
    icon: "mdi:instagram",
    id: (ids) => ids.instagramId,
    key: "instagram",
    label: "Instagram",
    pattern: /^[A-Za-z0-9._]{1,30}$/,
    url: (id) => `https://www.instagram.com/${id}/`,
  },
  {
    icon: "mdi:twitter",
    id: (ids) => ids.twitterId,
    key: "twitter",
    label: "Twitter",
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    url: (id) => `https://twitter.com/${id}`,
  },
  {
    icon: "mdi:facebook",
    id: (ids) => ids.facebookId,
    key: "facebook",
    label: "Facebook",
    pattern: /^[A-Za-z0-9.]{1,50}$/,
    url: (id) => `https://www.facebook.com/${id}`,
  },
  {
    icon: "ic:baseline-tiktok",
    id: (ids) => ids.tiktokId,
    key: "tiktok",
    label: "TikTok",
    pattern: /^[A-Za-z0-9._]{1,24}$/,
    url: (id) => `https://www.tiktok.com/@${id}`,
  },
  {
    icon: "mdi:youtube",
    id: (ids) => ids.youtubeId,
    key: "youtube",
    label: "YouTube",
    pattern: /^[A-Za-z0-9._-]{1,100}$/,
    url: (id) => `https://www.youtube.com/@${id}`,
  },
  {
    icon: "simple-icons:wikidata",
    id: (ids) => ids.wikidataId,
    key: "wikidata",
    label: "Wikidata",
    pattern: /^Q\d+$/,
    url: (id) => `https://www.wikidata.org/wiki/${id}`,
  },
];

export const CAREER_SLOT_CLASS = "relative min-w-[3px] max-w-7 flex-1";

export const CAREER_EDGE_SLOTS = 2;

export const CAREER_ROLL_RUNG = 0;

export const MAX_TIMELINE_TITLES = 3;

export const TIMELINE_SPINE_CLASS = "left-14 sm:left-20";

export const GROUP_PRIORITY = ["Acting", "Directing", "Writing", "Production"];

export const DEPARTMENT_JOBS: Readonly<Record<string, RegExp>> = {
  Directing: /^(?:co-)?director$/i,
  Production: /producer/i,
};

export const SHOWN_ALONGSIDE = ["Acting", "Directing"];

export const FILMOGRAPHY_SORTS: readonly {
  key: FilmographySort;
  label: string;
}[] = [
  { key: "popularity", label: "Popularity" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Film name" },
];

export const NOT_A_REAL_ROLE = /uncredited|cameo|self|archive/i;

export const VIEW_ACTIONS: readonly {
  icon: { off: string; on: string };
  key: Exclude<PersonViewKey, "main">;
  label: string;
}[] = [
  {
    icon: { off: "solar:sort-by-time-linear", on: "solar:sort-by-time-bold" },
    key: "timeline",
    label: "Timeline",
  },
  {
    icon: { off: "solar:cup-star-linear", on: "solar:cup-star-bold" },
    key: "awards",
    label: "Awards",
  },
];

export const SORT_OPTIONS = FILMOGRAPHY_SORTS.map(({ key, label }) => ({
  label,
  value: key,
}));

export const GALLERY_VIEWS: Record<GalleryTab, GalleryView> = {
  portraits: {
    aspect: "poster",
    item: CAROUSEL_ITEM,
    label: "Portraits",
    noun: "portrait",
    sizes: "(min-width: 768px) 160px, 30vw",
  },
  backdrops: {
    aspect: "video",
    item: CAROUSEL_WIDE_ITEM,
    label: "Backdrops",
    noun: "scene",
    sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
  },
};

export const BIO_SURFACE_WIDTH = 560;

export const SKELETON_FACT_WIDTHS = [
  ["2.5rem", "8rem"],
  ["2rem", "1.25rem"],
  ["4.5rem", "9rem"],
  ["5.5rem", "6.5rem"],
  ["4.5rem", "10rem"],
] as const;

export const SKELETON_BAR_COUNT = 24;

export const CAREER_MIN_FILMS = 3;
