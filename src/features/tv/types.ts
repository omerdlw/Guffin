import type { SupabaseClient } from "@supabase/supabase-js";
import type { MovieReviewSort } from "@/features/reviews/review";
import type { Database } from "@/lib/supabase/database.types";
import type {
  Episode,
  SeasonDetails,
  SeasonSummary,
  ShowDetails,
} from "@/lib/tmdb/shared";
import type { SHOW_STATUSES } from "./constants";

export type { Episode, SeasonDetails, SeasonSummary, ShowDetails };

export type TvClient = SupabaseClient<Database>;

export type ShowStatus = (typeof SHOW_STATUSES)[number];

export interface ShowProgress {
  airedEpisodes: number | null;
  lastEpisode: number | null;
  lastSeason: number | null;
  lastWatchedAt: string | null;
  status: ShowStatus;
  watchedEpisodes: number;
}

type WatchedEpisodeKeys = string[];

export interface EpisodeRatingMark {
  episode: number;
  rating: number;
  season: number;
}

export interface ShowTracking {
  progress: ShowProgress | null;
  ratings: EpisodeRatingMark[];
  watched: WatchedEpisodeKeys;
}

export type AiredEpisode = {
  e: number;
  r: number | null;
  s: number;
};

export interface ContinueItem {
  airedEpisodes: number | null;
  lastEpisode: number | null;
  lastSeason: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  showId: number;
  status: ShowStatus;
  title: string;
  watchedEpisodes: number;
}

export type TvActionResult<T extends object = object> =
  ({ success: true } & T) | { error: string; success: false };

export type ShowPageKind =
  | { kind: "show" }
  | { kind: "reviews"; reviewer: string | null; sort: ShowReviewSort };

type ShowReviewSort = MovieReviewSort;
