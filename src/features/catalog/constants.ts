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

/**
 * Flags that keep a title off discovery surfaces. The rest only lower its
 * score. Search is looser: a title someone typed the name of should show
 * unless it is plainly not a film or a show.
 */
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

/** Show-only blockers on discovery (decision table 3.2). */
export const SHOW_DISCOVERY_BLOCKERS: ReadonlySet<string> = new Set([
  "no_overview",
]);

/**
 * Thresholds per media type. Shows collect far fewer votes than films, so
 * their floor and prior sit lower. Tune these against `scripts/catalog/audit`.
 */
export const QUALITY_THRESHOLDS: Record<MediaType, QualityThresholds> = {
  movie: { bayesianWeight: 250, meanRating: 6.4, minEpisodes: 0, minVotes: 40 },
  tv: { bayesianWeight: 120, meanRating: 7.0, minEpisodes: 3, minVotes: 20 },
};

/** How the discovery score mixes its parts. */
export const SCORE_WEIGHTS = Object.freeze({
  bayesian: 0.6,
  popularity: 0.25,
  community: 0.15,
  /** Guffin ratings needed before the community part reaches full weight. */
  communitySaturation: 50,
  /** log10(popularity) that counts as fully popular. */
  popularityCeiling: 3,
});

/** A catalog row older than this is refreshed on the next view. */
export const CATALOG_STALE_MS: Record<MediaType, number> = {
  movie: 7 * 24 * 60 * 60 * 1000,
  tv: 24 * 60 * 60 * 1000,
};

/** Show statuses that mean new episodes may still come. */
export const AIRING_STATUSES: ReadonlySet<string> = new Set([
  "Returning Series",
  "In Production",
  "Planned",
  "Pilot",
]);
