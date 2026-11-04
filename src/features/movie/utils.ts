import type { CSSProperties } from "react";
import type { FactName } from "@/features/detail/types";
import { personHref } from "@/lib/project";
import {
  type MovieDetails,
  type MovieImage,
  type MovieImages,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { readable } from "@/motion/render";
import { headlineClass } from "@/ui/tokens";
import {
  CAST_BLUR_STEPS,
  CREW_JOB_PRIORITY,
  DOCK_DIRECTOR_LIMIT,
  EXACT_NUMBER_FORMAT,
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
  WRITING_JOBS,
} from "./constants";
import type {
  GalleryTab,
  MovieCrewEntry,
  Provider,
  ProviderEntry,
  RegionProviders,
} from "./types";

export const titleClass = (title: string) => headlineClass(title, [26, 37, 49]);

export function parseMovieId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

function formatRuntime(minutes: number | null): string | null {
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

export function getCast(movie: MovieDetails) {
  return uniqueById([...movie.credits.cast].sort((a, b) => a.order - b.order));
}

export function getCrew(movie: MovieDetails): MovieCrewEntry[] {
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

export function getVideoTypes(movie: MovieDetails): string[] {
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

export const safeProviderLink = (value: string | null | undefined) =>
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

export const castBlurLayer = (index: number): CSSProperties => {
  const step = 100 / (CAST_BLUR_STEPS.length + 1);
  const last = index === CAST_BLUR_STEPS.length - 1;
  return {
    "--blur": `${CAST_BLUR_STEPS[index]}px`,
    "--m0": `${index * step}%`,
    "--m1": `${(index + 1) * step}%`,
    "--m2": last ? "100%" : `${(index + 2) * step}%`,
    "--m3": last ? "100%" : `${(index + 3) * step}%`,
  } as CSSProperties;
};

export function compactCells(count: number, hasMore: boolean): CSSProperties {
  const extra = hasMore ? 1 : 0;
  return {
    "--cells": count + extra,
    "--cells-sm": Math.min(count, 2),
  } as CSSProperties;
}

export function galleryThumbnail(tab: GalleryTab, path: string) {
  if (tab === "backdrops") {
    return {
      crossOrigin: "anonymous" as const,
      src: tmdbImageUrl("backdrop", path, "w780"),
      srcSet: tmdbImageSrcSet("backdrop", path, ["w300", "w780", "w1280"]),
    };
  }
  return {
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342", "w500"]),
  };
}

export function wallThumbnail(tab: GalleryTab, path: string) {
  if (tab === "backdrops") {
    return {
      crossOrigin: "anonymous" as const,
      src: tmdbImageUrl("backdrop", path, "w780"),
      srcSet: tmdbImageSrcSet("backdrop", path, ["w300", "w780"]),
    };
  }
  return {
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342"]),
  };
}

export function galleryOriginal(tab: GalleryTab, path: string) {
  return tab === "backdrops"
    ? tmdbImageUrl("backdrop", path, "original")
    : tmdbImageUrl("poster", path, "original");
}

export const pluralType = (type: string) =>
  type.endsWith("s") ? type : `${type}s`;

export const pictureOf = (src: string | null) => (src ? readable(src) : null);

export const moneyLabel = (amount: number) => formatMoney(amount) ?? "$0";

export const asName = (person: { id: number; name: string }): FactName => ({
  href: personHref(person.id),
  text: person.name,
});

export const capitalize = (text: string) =>
  text.replace(
    /(^|\s)(\S)/g,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
  );

export const membersLabel = (count: number) =>
  `${EXACT_NUMBER_FORMAT.format(count)} ${count === 1 ? "member" : "members"}`;

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
