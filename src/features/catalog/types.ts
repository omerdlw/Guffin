import type { MediaType } from "@/lib/tmdb/shared";
import type { QUALITY_FLAGS } from "./constants";

export type { MediaType };

export type QualityFlag = (typeof QUALITY_FLAGS)[number];

export type QualitySurface = "discovery" | "search" | "detail";

export interface Quality {
  eligible: boolean;
  flags: QualityFlag[];
  score: number;
}

export interface MediaItem {
  adult: boolean;
  backdropPath: string | null;
  episodesCount: number | null;
  genreIds: number[];
  id: number;
  lastAirDate: string | null;
  mediaType: MediaType;
  originalLanguage: string | null;
  originalTitle: string | null;
  originCountries: string[];
  overview: string | null;
  popularity: number;
  posterPath: string | null;
  quality: Quality;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  seasonsCount: number | null;
  status: string | null;
  title: string;
  video: boolean;
  voteAverage: number | null;
  voteCount: number;
  year: number | null;
}

export interface RawTitle {
  adult?: boolean | null;
  backdropPath?: string | null;
  episodesCount?: number | null;
  genreIds?: readonly number[] | null;
  genres?: readonly { id: number }[] | null;
  id: number;
  lastAirDate?: string | null;
  originalLanguage?: string | null;
  originalTitle?: string | null;
  originCountries?: readonly string[] | null;
  overview?: string | null;
  popularity?: number | null;
  posterPath?: string | null;
  releaseDate?: string | null;
  runtimeMinutes?: number | null;
  seasonsCount?: number | null;
  status?: string | null;
  title: string;
  video?: boolean | null;
  voteAverage?: number | null;
  voteCount?: number | null;
}

export interface QualityThresholds {
  bayesianWeight: number;
  meanRating: number;
  minEpisodes: number;
  minVotes: number;
}

export interface CommunitySignal {
  liked: number;
  listed: number;
  ratingAverage: number | null;
  ratingsCount: number;
  watched: number;
}

export interface CatalogRow {
  backdrop_path: string | null;
  eligible: boolean;
  episodes_count: number | null;
  genre_ids: number[];
  last_air_date: string | null;
  media_type: MediaType;
  origin_countries: string[];
  original_language: string | null;
  original_title: string | null;
  popularity: number;
  poster_path: string | null;
  quality_flags: string[];
  quality_score: number;
  release_date: string | null;
  runtime_minutes: number | null;
  seasons_count: number | null;
  status: string | null;
  title: string;
  tmdb_id: number;
  vote_average: number | null;
  vote_count: number;
}

export interface GoldenCase {
  expected: boolean;
  raw: RawTitle;
}
