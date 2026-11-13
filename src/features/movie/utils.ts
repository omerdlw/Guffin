import type { CSSProperties } from "react";
import { headlineClass } from "@/design/foundations/layout";
import type { FactName } from "@/features/detail/detail";
import { pluralize } from "@/lib/format";
import { personHref } from "@/lib/project";
import {
  type MovieDetails,
  type MovieImage,
  type MovieImages,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { readable } from "@/motion/render";
import {
  CREW_JOB_PRIORITY,
  DOCK_DIRECTOR_LIMIT,
  FALLBACK_REGION,
  MOVIE_CERTIFICATION_REGION,
  MOVIE_DATE_FORMAT,
  MOVIE_MONEY_FORMAT,
  MOVIE_RECOMMENDATION_LIMIT,
  MOVIE_TAG_LIMIT,
  MOVIE_TAG_MAX_LENGTH,
  MOVIE_WRITER_LIMIT,
  PROVIDER_SEARCH_URLS,
  RELEASE_TYPE_PRIORITY,
  THUMBNAIL_WIDTHS,
  WRITING_JOBS,
} from "./constants";
import type {
  FilmStats,
  GalleryTab,
  MovieCrewEntry,
  PeopleTab,
  PersonEntry,
  Provider,
  ProviderEntry,
  RegionProviders,
} from "./types";

export const TITLE_LIMITS = [26, 37, 49] as const;

export const movieTitleClass = (title: string) =>
  headlineClass(title, TITLE_LIMITS);

export function parseMovieId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatReleaseDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? null
    : MOVIE_DATE_FORMAT.format(parsed);
}

export function formatMoney(amount: number | null): string | null {
  return amount ? MOVIE_MONEY_FORMAT.format(amount) : null;
}

function uniqueById<T extends { id: number }>(items: readonly T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id));
}

export function getDirectors(movie: MovieDetails) {
  return uniqueById(movie.credits.crew.filter((c) => c.job === "Director"));
}

export function getWriters(movie: MovieDetails, limit = MOVIE_WRITER_LIMIT) {
  return uniqueById(
    movie.credits.crew.filter(
      (c) => c.department === "Writing" && c.job && WRITING_JOBS.has(c.job),
    ),
  ).slice(0, limit);
}

function getCast(movie: MovieDetails) {
  return uniqueById([...movie.credits.cast].sort((a, b) => a.order - b.order));
}

function getCrew(movie: MovieDetails): MovieCrewEntry[] {
  const people = new Map<number, MovieCrewEntry & { rank: number }>();
  const rankOf = (job: string | null) => {
    const index = job ? CREW_JOB_PRIORITY.indexOf(job) : -1;
    return index === -1 ? CREW_JOB_PRIORITY.length : index;
  };

  for (const member of movie.credits.crew) {
    if (!member.job) continue;
    const existing = people.get(member.id);
    if (!existing) {
      people.set(member.id, {
        creditId: member.creditId,
        department: member.department,
        id: member.id,
        jobs: member.job,
        name: member.name,
        profilePath: member.profilePath,
        rank: rankOf(member.job),
      });
    } else {
      if (!existing.jobs.split(" / ").includes(member.job)) {
        existing.jobs = `${existing.jobs} / ${member.job}`;
      }
      existing.rank = Math.min(existing.rank, rankOf(member.job));
    }
  }

  return [...people.values()]
    .sort((a, b) => a.rank - b.rank)
    .map(({ rank: _rank, ...entry }) => entry);
}

export function getTags(movie: MovieDetails, limit = MOVIE_TAG_LIMIT) {
  const genres = new Set(movie.genres.map((g) => g.name.toLowerCase()));
  const seen = new Set<string>();
  return movie.keywords
    .map((keyword) => keyword.name.trim())
    .filter((name) => {
      const key = name.toLowerCase();
      if (!name || name.length > MOVIE_TAG_MAX_LENGTH) return false;
      if (genres.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
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

export function getOriginalLanguageName(movie: MovieDetails): string | null {
  return (
    movie.spokenLanguages.find((l) => l.code === movie.originalLanguage)
      ?.englishName ?? movie.originalLanguage
  );
}

export function getRecommendations(
  movie: MovieDetails,
  limit = MOVIE_RECOMMENDATION_LIMIT,
) {
  return movie.recommendations.filter((m) => m.id !== movie.id).slice(0, limit);
}

export function getCertification(
  movie: MovieDetails,
  region: string = MOVIE_CERTIFICATION_REGION,
): string | null {
  const releases =
    movie.releaseDates.find((r) => r.region === region)?.releases ?? [];
  const rank = (type: number) => {
    const index = RELEASE_TYPE_PRIORITY.indexOf(type);
    return index === -1 ? RELEASE_TYPE_PRIORITY.length : index;
  };
  return (
    [...releases]
      .filter((r) => r.certification)
      .sort((a, b) => rank(a.type) - rank(b.type))[0]?.certification ?? null
  );
}

export function describeMovie(movie: MovieDetails): string {
  const directors = getDirectors(movie)
    .slice(0, DOCK_DIRECTOR_LIMIT)
    .map((director) => director.name)
    .join(", ");
  return [
    directors && `by ${directors}`,
    movie.releaseYear,
    formatRuntime(movie.runtimeMinutes),
  ]
    .filter(Boolean)
    .join(" · ");
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

export const sanitizeProviderLink = (value: string | null | undefined) =>
  typeof value === "string" && value.startsWith("https://www.themoviedb.org/")
    ? value
    : null;

export const providerEntries = (
  ...groups: readonly (readonly Provider[])[]
): ProviderEntry[] => {
  const seen = new Set<number>();
  return groups
    .flat()
    .sort((a, b) => a.displayPriority - b.displayPriority)
    .filter((p) => !seen.has(p.providerId) && seen.add(p.providerId))
    .map((p) => ({ id: p.providerId, logoPath: p.logoPath, name: p.name }));
};

export function compactCells(count: number, hasMore: boolean): CSSProperties {
  const extra = hasMore ? 1 : 0;
  return {
    "--cells": count + extra,
    "--cells-sm": Math.min(count, 2),
  } as CSSProperties;
}

export function thumbnailFor(
  variant: "gallery" | "wall",
  tab: GalleryTab,
  path: string,
) {
  const widths = THUMBNAIL_WIDTHS[variant];
  if (tab === "backdrops") {
    return {
      crossOrigin: "anonymous" as const,
      src: tmdbImageUrl("backdrop", path, "w780"),
      srcSet: tmdbImageSrcSet("backdrop", path, widths.backdrops) ?? undefined,
    };
  }
  return {
    crossOrigin: undefined,
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, widths.posters) ?? undefined,
  };
}

export function galleryOriginal(tab: GalleryTab, path: string) {
  return tab === "backdrops"
    ? tmdbImageUrl("backdrop", path, "original")
    : tmdbImageUrl("poster", path, "original");
}

export const pluralizeVideoType = (type: string) =>
  type.endsWith("s") ? type : `${type}s`;

export const readableUrl = (src: string | null) => (src ? readable(src) : null);

export const formatMoneyOrZero = (amount: number) =>
  formatMoney(amount) ?? "$0";

export const toFactName = (person: { id: number; name: string }): FactName => ({
  href: personHref(person.id),
  text: person.name,
});

export const capitalizeWords = (text: string) =>
  text.replace(
    /(^|\s)(\S)/g,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
  );

export const formatMembers = (count: number) => pluralize(count, "member");

export function providerHref(
  provider: ProviderEntry,
  title: string,
  region: RegionProviders,
): string | null {
  const q = encodeURIComponent(title.trim());
  const match = PROVIDER_SEARCH_URLS.find(([pattern]) =>
    pattern.test(provider.name),
  );
  if (match && q) return match[1](q);
  return region.link;
}

export const regionName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

export const flagOf = (code: string) =>
  String.fromCodePoint(
    ...code.split("").map((char) => 127397 + char.charCodeAt(0)),
  );

export function pickRegion(codes: readonly string[]): string {
  const language = typeof navigator === "undefined" ? "" : navigator.language;
  const own = language.split("-")[1]?.toUpperCase();
  if (own && codes.includes(own)) return own;
  return codes.includes(FALLBACK_REGION) ? FALLBACK_REGION : (codes[0] ?? "");
}

export function toPersonEntries(movie: MovieDetails): {
  cast: PersonEntry[];
  crew: PersonEntry[];
} {
  return {
    cast: getCast(movie).map((member) => ({
      id: member.id,
      key: member.creditId,
      name: member.name,
      profilePath: member.profilePath,
      subtitle: member.character ?? "Cast",
    })),
    crew: getCrew(movie).map((member) => ({
      id: member.id,
      key: `${member.id}-${member.creditId}`,
      name: member.name,
      profilePath: member.profilePath,
      subtitle: member.jobs,
    })),
  };
}

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

export function emptyReviewsMessage(
  filter: string,
  username: string | null,
): string {
  if (filter !== "all") return "No entries match this filter";
  return username
    ? "No entry from this account yet"
    : "No reviews yet. Be the first.";
}
