import { readParam } from "@/lib/http";
import { MEDIA_TYPE_COPY, VITRIN_PARAM } from "./constants";
import type { MediaType } from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

export function readVitrinParam(
  params: SearchParams | undefined,
): MediaType | null {
  const value = readParam(params, VITRIN_PARAM);
  return value === "tv" ? "tv" : value === "movie" ? "movie" : null;
}

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
