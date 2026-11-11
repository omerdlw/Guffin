import type { MediaType, QualityThresholds } from "./types";

export const MEDIA_TYPES = [
  "movie",
  "tv",
] as const satisfies readonly MediaType[];

export const QUALITY_FLAGS = [
  "adult",
  "event_title",
  "excluded_genre",
  "few_episodes",
  "low_votes",
  "no_date",
  "no_overview",
  "no_poster",
  "unreleased",
  "video",
] as const;

export const BLOCKING_FLAGS = Object.freeze({
  discovery: new Set([
    "adult",
    "event_title",
    "excluded_genre",
    "few_episodes",
    "low_votes",
    "no_date",
    "no_poster",
    "unreleased",
    "video",
  ]),
  search: new Set(["adult", "event_title", "excluded_genre", "video"]),
  detail: new Set<string>(),
} as const);

export const SHOW_DISCOVERY_BLOCKERS: ReadonlySet<string> = new Set([
  "no_overview",
]);

export const QUALITY_THRESHOLDS: Record<MediaType, QualityThresholds> = {
  movie: { bayesianWeight: 250, meanRating: 6.4, minEpisodes: 0, minVotes: 40 },
  tv: { bayesianWeight: 120, meanRating: 7.0, minEpisodes: 3, minVotes: 20 },
};

export const SCORE_WEIGHTS = Object.freeze({
  bayesian: 0.6,
  popularity: 0.25,
  community: 0.15,
  communitySaturation: 50,
  popularityCeiling: 3,
});

export const CATALOG_STALE_MS: Record<MediaType, number> = {
  movie: 7 * 24 * 60 * 60 * 1000,
  tv: 24 * 60 * 60 * 1000,
};

export const AIRING_STATUSES: ReadonlySet<string> = new Set([
  "Returning Series",
  "In Production",
  "Planned",
  "Pilot",
]);
