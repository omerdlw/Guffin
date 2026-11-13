import type { MediaType } from "@/lib/tmdb/shared";

interface MediaTypeCopy {
  icon: string;
  label: string;
  plural: string;
  singular: string;
}

export const VITRIN_PARAM = "v";

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

export function withVitrin(href: string, mediaType: MediaType): string {
  const url = new URL(href, "https://guffin.invalid");
  if (mediaType === "tv") url.searchParams.set(VITRIN_PARAM, "tv");
  else url.searchParams.delete(VITRIN_PARAM);
  url.searchParams.delete("page");
  return `${url.pathname}${url.search}`;
}

export function mediaNoun(mediaType: MediaType, count?: number): string {
  const copy = MEDIA_TYPE_COPY[mediaType];
  return count === 1 ? copy.singular : copy.plural;
}
