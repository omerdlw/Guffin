import type { z } from "zod";
import type {
  featuredMoviePageSchema,
  movieDetailsSchema,
  movieImagesSchema,
  movieSearchPageSchema,
  personDetailsSchema,
  personSearchPageSchema,
  seasonDetailsSchema,
  showDetailsSchema,
  showPageSchema,
} from "./schemas";

export const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_WEBSITE_URL = "https://www.themoviedb.org";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export const TMDB_DEFAULT_LANGUAGE = "en-US";

export const TMDB_TIMEOUT_MS = 8_000;
export const TMDB_AWARDS_TIMEOUT_MS = 10_000;

export const TMDB_RETRY = Object.freeze({
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  maxRetryAfterMs: 5_000,
});

export const TMDB_REVALIDATE = Object.freeze({
  movie: 60 * 60 * 6,
  tv: 60 * 60 * 6,
  season: 60 * 60 * 6,
  airingSeason: 60 * 60,
  person: 60 * 60 * 6,
  awards: 60 * 60 * 24,
  search: 60 * 60,
  feed: 60 * 30,
});

export const TMDB_SEARCH_LIMITS = Object.freeze({
  maxQueryLength: 100,
  maxPage: 500,
});

export const GENRE = Object.freeze({
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  scienceFiction: 878,
  thriller: 53,
  tvMovie: 10770,
  war: 10752,
  western: 37,
  // TV-only genres
  actionAdventure: 10759,
  kids: 10762,
  news: 10763,
  reality: 10764,
  sciFiFantasy: 10765,
  soap: 10766,
  talk: 10767,
  warPolitics: 10768,
});

/** A TV role counts toward a career from this many episodes. */
export const TV_CAREER_MIN_EPISODES = 3;

export const TMDB_CACHE_TAG = "tmdb";

export const tmdbCacheTag = (...parts: (string | number)[]) =>
  [TMDB_CACHE_TAG, ...parts].join(":");

interface TmdbImageSizes {
  backdrop: "w300" | "w780" | "w1280" | "original";
  logo: "w45" | "w92" | "w154" | "w185" | "w300" | "w500" | "original";
  poster: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";
  profile: "w45" | "w185" | "h632" | "original";
}

type TmdbImageKind = keyof TmdbImageSizes;

const IMAGE_PATH = /^\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|svg)$/;

export function isTmdbImagePath(value: unknown): value is string {
  return typeof value === "string" && IMAGE_PATH.test(value);
}

export function tmdbImageUrl<K extends TmdbImageKind>(
  _kind: K,
  path: string | null | undefined,
  size: TmdbImageSizes[K],
): string | null {
  if (!path || !IMAGE_PATH.test(path)) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function tmdbImageSrcSet<K extends TmdbImageKind>(
  kind: K,
  path: string | null | undefined,
  sizes: readonly TmdbImageSizes[K][],
): string | null {
  const entries: string[] = [];
  for (const size of sizes) {
    const match = /^w(\d+)$/.exec(size);
    const url = tmdbImageUrl(kind, path, size);
    if (match && url) entries.push(`${url} ${match[1]}w`);
  }
  return entries.length > 0 ? entries.join(", ") : null;
}

export type MovieDetails = z.output<typeof movieDetailsSchema>;
export type MovieSearchPage = z.output<typeof movieSearchPageSchema>;

export type FeaturedMoviePage = z.output<typeof featuredMoviePageSchema>;
export type FeaturedMovie = FeaturedMoviePage["results"][number];

export type PersonSearchPage = z.output<typeof personSearchPageSchema>;

export type PersonDetails = z.output<typeof personDetailsSchema>;
export type PersonCastCredit = PersonDetails["credits"]["cast"][number];
export type PersonCrewCredit = PersonDetails["credits"]["crew"][number];
export type PersonImage = PersonDetails["images"]["profiles"][number];
export type PersonExternalIds = PersonDetails["externalIds"];

export type PersonTvCastCredit = PersonDetails["tvCredits"]["cast"][number];
export type PersonTvCrewCredit = PersonDetails["tvCredits"]["crew"][number];

export type ShowDetails = z.output<typeof showDetailsSchema>;
export type ShowPage = z.output<typeof showPageSchema>;
export type ShowSummary = ShowPage["results"][number];
export type SeasonSummary = ShowDetails["seasons"][number];
export type SeasonDetails = z.output<typeof seasonDetailsSchema>;
export type Episode = SeasonDetails["episodes"][number];
export type ShowCastMember = ShowDetails["credits"]["cast"][number];
export type ShowCrewMember = ShowDetails["credits"]["crew"][number];

export type MediaType = "movie" | "tv";

export type MovieImage = MovieDetails["images"]["posters"][number];
export type MovieImages = z.output<typeof movieImagesSchema>;
export type MovieVideo = MovieDetails["videos"][number];

export interface AwardRecipient {
  id: number;
  name: string;
  profilePath: string | null;
}

export interface Award {
  category: string;
  ceremony: string;
  mediaType: "movie" | "tv" | null;
  posterPath: string | null;
  project: string | null;
  projectId: number | null;
  recipients: AwardRecipient[];
  won: boolean;
  year: string | null;
}

export interface AwardOrganization {
  awards: Award[];
  id: string;
  logoPath: string | null;
  title: string;
}

export interface Awards {
  nominations: number;
  organizations: AwardOrganization[];
  wins: number;
}
