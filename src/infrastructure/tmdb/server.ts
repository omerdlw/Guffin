import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  AMBIENT_ANALYSIS_VERSION,
  AmbientDecoderMissingError,
  type AmbientPalette,
  extractAmbientPalette,
} from "@omerdlw/base-framework/ambient/server";
import { report } from "@omerdlw/base-framework/utils";
import { getTmdbConfig } from "@/infrastructure/config";
import { AMBIENT_ANALYSIS } from "@/shared/ambient";
import { createTmdbClient, type TmdbClient } from "./api";
import type {
  DiscoverOptions,
  ListOptions,
  MovieList,
  TrendingWindow,
} from "./discover";
import { TMDB_IMAGE_BASE_URL } from "./model";
import type { MovieDetailsOptions, MovieSearchOptions } from "./movies";
import type { PersonDetailsOptions, PersonSearchOptions } from "./people";

let client: TmdbClient | undefined;

function getTmdb(): TmdbClient {
  client ??= createTmdbClient({
    config: getTmdbConfig,
    onError: (error, path) => report(`TMDB ${path}`, error),
  });
  return client;
}

export const getMovieDetails = cache(
  (id: number, language?: MovieDetailsOptions["language"]) =>
    getTmdb().movies.getDetails(id, { language }),
);

export const getMovieImages = cache((id: number) =>
  getTmdb().movies.getImages(id),
);

export function searchMovies(query: string, options?: MovieSearchOptions) {
  return getTmdb().movies.search(query, options);
}

export const getPersonDetails = cache(
  (id: number, language?: PersonDetailsOptions["language"]) =>
    getTmdb().people.getDetails(id, { language }),
);

export const getPersonAwards = cache((id: number) =>
  getTmdb().awards.forPerson(id),
);

export const getMovieAwards = cache((id: number) =>
  getTmdb().awards.forMovie(id),
);

export function searchPeople(query: string, options?: PersonSearchOptions) {
  return getTmdb().people.search(query, options);
}

export function getTrendingMovies(
  window: TrendingWindow,
  options?: ListOptions,
) {
  return getTmdb().discover.trending(window, options);
}

export function getMovieList(list: MovieList, options?: ListOptions) {
  return getTmdb().discover.list(list, options);
}

export function discoverMovies(options?: DiscoverOptions) {
  return getTmdb().discover.discover(options);
}

export function findMovieByImdb(imdbId: string, options?: ListOptions) {
  return getTmdb().discover.findByImdb(imdbId, options);
}

const TMDB_PATH = /^\/[A-Za-z0-9._-]{1,200}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function movieSnapshot(movie: {
  backdropPath: string | null;
  genres: { id: number }[];
  originalTitle: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  title: string;
  voteAverage?: number | null;
}) {
  const path = (value: string | null) =>
    value && TMDB_PATH.test(value) ? value : null;

  return {
    backdropPath: path(movie.backdropPath),
    payload: {
      genre_ids: movie.genres.map((genre) => genre.id),
      vote_average: movie.voteAverage ?? null,
    },
    posterPath: path(movie.posterPath),
    releaseDate:
      movie.releaseDate && ISO_DATE.test(movie.releaseDate)
        ? movie.releaseDate
        : null,
    title: (
      movie.title.trim() ||
      movie.originalTitle?.trim() ||
      "Untitled"
    ).slice(0, 300),
  };
}

const IMAGE_HOST = new URL(TMDB_IMAGE_BASE_URL).hostname;

const PALETTE_VERSION = `ambient-v${AMBIENT_ANALYSIS_VERSION}-${AMBIENT_ANALYSIS.ground}`;
const PALETTE_TIMEOUT_MS = 3_000;

class NoPalette extends Error {}

const paletteOf = unstable_cache(
  async (url: string): Promise<AmbientPalette> => {
    const palette = await extractAmbientPalette(url, {
      analysis: AMBIENT_ANALYSIS,
      allow: (target) =>
        target.protocol === "https:" && target.hostname === IMAGE_HOST,
      timeoutMs: PALETTE_TIMEOUT_MS,
    });
    if (!palette) throw new NoPalette(url);
    return palette;
  },
  [PALETTE_VERSION],
);

export async function getAmbientPalette(
  url: string | null,
): Promise<AmbientPalette | null> {
  if (!url) return null;
  try {
    return await paletteOf(url);
  } catch (error) {
    if (error instanceof AmbientDecoderMissingError) report("Ambient", error);
    return null;
  }
}
