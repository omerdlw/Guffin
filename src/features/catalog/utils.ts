import {
  isFilmTitle,
  isShowTitle,
  looksLikeEventShow,
  EXCLUDED_TV_GENRES,
} from "@/lib/tmdb/rules";
import {
  AIRING_STATUSES,
  BLOCKING_FLAGS,
  MEDIA_TYPES,
  QUALITY_THRESHOLDS,
  SCORE_WEIGHTS,
  SHOW_DISCOVERY_BLOCKERS,
} from "./constants";
import type {
  CatalogRow,
  CommunitySignal,
  MediaItem,
  MediaType,
  Quality,
  QualityFlag,
  QualitySurface,
  RawTitle,
} from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TMDB_PATH = /^\/[A-Za-z0-9._-]{1,200}$/;

export function isMediaType(value: unknown): value is MediaType {
  return (MEDIA_TYPES as readonly unknown[]).includes(value);
}

export function parseMediaType(value: unknown): MediaType {
  return value === "tv" ? "tv" : "movie";
}

const cleanDate = (value: string | null | undefined) =>
  value && ISO_DATE.test(value) ? value : null;

const cleanPath = (value: string | null | undefined) =>
  value && TMDB_PATH.test(value) ? value : null;

const cleanText = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function bayesianRating(
  average: number | null,
  votes: number,
  weight: number,
  mean: number,
): number {
  if (!average || votes <= 0) return mean;
  return (
    (votes / (votes + weight)) * average + (weight / (votes + weight)) * mean
  );
}

function qualityFlags(
  item: Omit<MediaItem, "quality">,
  today: string = new Date().toISOString().slice(0, 10),
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const thresholds = QUALITY_THRESHOLDS[item.mediaType];
  const signals = {
    genreIds: item.genreIds,
    originalTitle: item.originalTitle,
    title: item.title,
    video: item.video,
  };

  if (item.adult) flags.push("adult");
  if (!item.posterPath) flags.push("no_poster");
  if (!item.overview) flags.push("no_overview");
  if (!item.releaseDate) flags.push("no_date");
  else if (item.releaseDate > today) flags.push("unreleased");
  if (item.voteCount < thresholds.minVotes) flags.push("low_votes");

  if (item.mediaType === "movie") {
    if (item.video) flags.push("video");
    if (!isFilmTitle(signals)) flags.push("event_title");
  } else {
    if (item.genreIds.some((genre) => EXCLUDED_TV_GENRES.has(genre))) {
      flags.push("excluded_genre");
    } else if (!isShowTitle(signals) || looksLikeEventShow(signals)) {
      flags.push("event_title");
    }
    if (
      item.episodesCount !== null &&
      item.episodesCount < thresholds.minEpisodes
    ) {
      flags.push("few_episodes");
    }
  }
  return flags;
}

function communityScore(signal: CommunitySignal | null): number {
  if (!signal || signal.ratingsCount === 0 || signal.ratingAverage === null)
    return 0;
  const confidence = Math.min(
    1,
    signal.ratingsCount / SCORE_WEIGHTS.communitySaturation,
  );
  return (signal.ratingAverage / 5) * confidence;
}

export function qualityScore(
  item: Pick<
    MediaItem,
    "mediaType" | "popularity" | "voteAverage" | "voteCount"
  >,
  community: CommunitySignal | null = null,
): number {
  const { bayesianWeight, meanRating } = QUALITY_THRESHOLDS[item.mediaType];
  const bayes =
    bayesianRating(
      item.voteAverage,
      item.voteCount,
      bayesianWeight,
      meanRating,
    ) / 10;
  const popularity = Math.min(
    1,
    Math.log10(1 + Math.max(0, item.popularity)) /
      SCORE_WEIGHTS.popularityCeiling,
  );
  const score =
    SCORE_WEIGHTS.bayesian * bayes +
    SCORE_WEIGHTS.popularity * popularity +
    SCORE_WEIGHTS.community * communityScore(community);
  return Math.round(score * 10_000) / 10_000;
}

export function isEligible(
  mediaType: MediaType,
  flags: readonly string[],
  surface: QualitySurface = "discovery",
): boolean {
  const blocking = BLOCKING_FLAGS[surface];
  return !flags.some(
    (flag) =>
      blocking.has(flag) ||
      (surface === "discovery" &&
        mediaType === "tv" &&
        SHOW_DISCOVERY_BLOCKERS.has(flag)),
  );
}

function assessQuality(
  item: Omit<MediaItem, "quality">,
  community: CommunitySignal | null = null,
): Quality {
  const flags = qualityFlags(item);
  return {
    eligible: isEligible(item.mediaType, flags),
    flags,
    score: qualityScore(item, community),
  };
}

export function toMediaItem(
  raw: RawTitle,
  mediaType: MediaType,
  community: CommunitySignal | null = null,
): MediaItem {
  const releaseDate = cleanDate(raw.releaseDate);
  const base: Omit<MediaItem, "quality"> = {
    adult: raw.adult ?? false,
    backdropPath: cleanPath(raw.backdropPath),
    episodesCount: mediaType === "tv" ? (raw.episodesCount ?? null) : null,
    genreIds: [...(raw.genreIds ?? raw.genres?.map((genre) => genre.id) ?? [])],
    id: raw.id,
    lastAirDate: mediaType === "tv" ? cleanDate(raw.lastAirDate) : null,
    mediaType,
    originalLanguage: cleanText(raw.originalLanguage),
    originalTitle: cleanText(raw.originalTitle),
    originCountries: [...(raw.originCountries ?? [])],
    overview: cleanText(raw.overview),
    popularity: raw.popularity ?? 0,
    posterPath: cleanPath(raw.posterPath),
    releaseDate,
    runtimeMinutes: raw.runtimeMinutes ?? null,
    seasonsCount: mediaType === "tv" ? (raw.seasonsCount ?? null) : null,
    status: cleanText(raw.status),
    title: (
      cleanText(raw.title) ??
      cleanText(raw.originalTitle) ??
      "Untitled"
    ).slice(0, 300),
    video: raw.video ?? false,
    voteAverage: raw.voteAverage ?? null,
    voteCount: raw.voteCount ?? 0,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
  };
  return { ...base, quality: assessQuality(base, community) };
}

export function filterEligible<T extends RawTitle>(
  items: readonly T[],
  mediaType: MediaType,
  surface: QualitySurface = "discovery",
): T[] {
  return items.filter((item) =>
    isEligible(mediaType, toMediaItem(item, mediaType).quality.flags, surface),
  );
}

export function isAiring(status: string | null | undefined): boolean {
  return status ? AIRING_STATUSES.has(status) : false;
}

export function toCatalogRow(item: MediaItem): CatalogRow {
  return {
    backdrop_path: item.backdropPath,
    eligible: item.quality.eligible,
    episodes_count: item.episodesCount,
    genre_ids: item.genreIds,
    last_air_date: item.lastAirDate,
    media_type: item.mediaType,
    origin_countries: item.originCountries,
    original_language: item.originalLanguage,
    original_title: item.originalTitle,
    popularity: item.popularity,
    poster_path: item.posterPath,
    quality_flags: item.quality.flags,
    quality_score: item.quality.score,
    release_date: item.releaseDate,
    runtime_minutes: item.runtimeMinutes,
    seasons_count: item.seasonsCount,
    status: item.status,
    title: item.title,
    tmdb_id: item.id,
    vote_average: item.voteAverage,
    vote_count: item.voteCount,
  };
}
