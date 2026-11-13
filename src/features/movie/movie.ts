import type { ModalContainerProps } from "@omerdlw/base-framework/modal";
import { headlineClass } from "@/design/foundations/layout";
import type { KnownTitle } from "@/features/person/credits";
import {
  type MovieDetails,
  type MovieImage,
  type MovieImages,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { readable } from "@/motion/gl";

export interface PersonEntry {
  id: number;
  key: string;
  name: string;
  profilePath: string | null;
  subtitle: string;
}

export interface FilmStats {
  liked: number;
  listed: number;
  ratings: number[];
  reviews: number;
  watched: number;
  watchlist: number;
}

export interface ProviderEntry {
  id: number;
  logoPath: string | null;
  name: string;
}

export interface RegionProviders {
  buy: ProviderEntry[];
  free: ProviderEntry[];
  link: string | null;
  rent: ProviderEntry[];
  stream: ProviderEntry[];
}

export interface CastModalProps<T> {
  close: (result?: unknown) => void;
  data: T;
  header: ModalContainerProps["header"];
}

export type PeopleModalData = {
  cast: PersonEntry[];
  crew: PersonEntry[];
  initialTab: "cast" | "crew";
};

export type VideoModalData = {
  key: string;
  name: string;
};

export type PeopleTab = "cast" | "crew";

export type KnownForMap = Record<
  PeopleTab,
  Record<number, readonly KnownTitle[]>
>;

export type MovieArtwork = Pick<
  MovieDetails,
  "backdropPath" | "id" | "posterPath" | "title"
>;

export const MOVIE_FEATURED_PEOPLE = 8;

export const TAGLINE_TYPE = "type-body sm:type-copy";

export const TAGLINE_CLASS = `${TAGLINE_TYPE} font-medium tracking-tagline uppercase text-balance`;

export const AFTER_TAGLINE = "mt-4";

const MOVIE_MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  notation: "compact",
  style: "currency",
});

export const COLLECTION_ICONS = {
  like: { off: "solar:heart-linear", on: "solar:heart-bold" },
  watched: { off: "solar:eye-linear", on: "solar:eye-bold" },
  watchlist: { off: "solar:bookmark-linear", on: "solar:bookmark-bold" },
  diary: { off: "solar:notebook-linear", on: "solar:notebook-bold" },
  list: { off: "solar:folder-open-linear", on: "solar:folder-open-bold" },
  providers: { off: "solar:tv-linear", on: "solar:tv-bold" },
  awards: { off: "solar:cup-star-linear", on: "solar:cup-star-bold" },
};

export const TITLE_LIMITS = [26, 37, 49] as const;

export const movieTitleClass = (title: string) =>
  headlineClass(title, TITLE_LIMITS);

export function parseMovieId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

export function formatMoney(amount: number | null): string | null {
  return amount ? MOVIE_MONEY_FORMAT.format(amount) : null;
}

export function uniqueById<T extends { id: number }>(items: readonly T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id));
}

export function getDirectors(movie: MovieDetails) {
  return uniqueById(movie.credits.crew.filter((c) => c.job === "Director"));
}

const byVotes = (a: MovieImage, b: MovieImage) =>
  b.voteAverage - a.voteAverage || b.voteCount - a.voteCount;

export function getGalleryImages(images: MovieImages) {
  const clean = images.backdrops.filter((image) => !image.language);
  const lettered = images.backdrops.filter((image) => image.language);
  return [...clean.sort(byVotes), ...lettered.sort(byVotes)];
}

export function getPosterImages(images: MovieImages) {
  return [...images.posters].sort(byVotes);
}

export function getVideoTypes(movie: Pick<MovieDetails, "videos">): string[] {
  return [
    ...new Set(
      movie.videos.filter((v) => v.site === "YouTube").map((v) => v.type),
    ),
  ];
}

export function movieSwatch(
  backdropPath: string | null,
  posterPath: string | null,
): string | null {
  return (
    tmdbImageUrl("backdrop", backdropPath, "w300") ??
    tmdbImageUrl("poster", posterPath, "w185")
  );
}

export const readableUrl = (src: string | null) => (src ? readable(src) : null);

export const capitalizeWords = (text: string) =>
  text.replace(
    /(^|\s)(\S)/g,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
  );

export function hasFilmStats(stats: FilmStats | null): stats is FilmStats {
  return stats !== null && stats.watched + stats.listed + stats.liked > 0;
}

export function peopleTabs(
  cast: readonly PersonEntry[],
  crew: readonly PersonEntry[],
): { key: PeopleTab; label: string }[] {
  return [
    ...(cast.length ? [{ key: "cast" as const, label: "Cast" }] : []),
    ...(crew.length ? [{ key: "crew" as const, label: "Crew" }] : []),
  ];
}
