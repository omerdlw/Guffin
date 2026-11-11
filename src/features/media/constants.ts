import type { MediaType, MediaTypeCopy } from "./types";

export const VITRIN_PARAM = "v";

export const VITRIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const MEDIA_TYPE_COPY: Record<MediaType, MediaTypeCopy> = {
  movie: {
    icon: "solar:clapperboard-play-bold",
    label: "Films",
    plural: "films",
    singular: "film",
  },
  tv: {
    icon: "solar:tv-bold",
    label: "Shows",
    plural: "shows",
    singular: "show",
  },
};

export const VITRIN_ITEMS = [
  { key: "movie", label: "Films" },
  { key: "tv", label: "Shows" },
] as const satisfies readonly { key: MediaType; label: string }[];
