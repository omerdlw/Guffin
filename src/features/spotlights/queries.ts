import "server-only";

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { report } from "@omerdlw/base-framework/utils";
import { getRedisClient } from "@/infrastructure/security";
import { TMDB_GENRES } from "@/infrastructure/tmdb/genres";
import { findMovieByImdb } from "@/infrastructure/tmdb/server";
import { CANON } from "./catalog";
import type { CanonFilm } from "./model";

interface Kept<T> {
  at: number;
  value: T;
}

// TMDB's names, with the one long label shortened for the spotlight chips.
const GENRE_LABELS: Readonly<Record<number, string>> = {
  ...TMDB_GENRES,
  878: "Sci-Fi",
};

const CATALOG_FRESH_MS = 24 * 60 * 60_000;

const CATALOG_KEEP_SECONDS = 7 * 24 * 60 * 60;

const SPOTLIGHT_GENRE_LIMIT = 3;

const genreNames = (ids: readonly number[]) =>
  ids
    .flatMap((id) => (GENRE_LABELS[id] ? [GENRE_LABELS[id]] : []))
    .slice(0, SPOTLIGHT_GENRE_LIMIT);

const building = new Map<string, Promise<unknown>>();

function build<T>(key: string, make: () => Promise<T>): Promise<T> {
  const running = building.get(key) as Promise<T> | undefined;
  if (running) return running;
  const run = make()
    .then(async (value) => {
      const redis = getRedisClient();
      if (redis && (!Array.isArray(value) || value.length > 0)) {
        const entry: Kept<T> = { at: Date.now(), value };
        await redis
          .set(key, entry, { ex: CATALOG_KEEP_SECONDS })
          .catch((error: unknown) => {
            unstable_rethrow(error);
            report(`Spotlight ${key} write`, error);
          });
      }
      return value;
    })
    .finally(() => building.delete(key));
  building.set(key, run);
  return run;
}

async function kept<T>(key: string, make: () => Promise<T>): Promise<T> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const entry = await redis.get<Kept<T>>(key);
      if (entry) {
        if (Date.now() - entry.at > CATALOG_FRESH_MS) {
          after(() =>
            build(key, make).catch((error: unknown) =>
              report(`Spotlight ${key} refresh`, error),
            ),
          );
        }
        return entry.value;
      }
    } catch (error) {
      unstable_rethrow(error);
      report(`Spotlight ${key} read`, error);
    }
  }
  return build(key, make);
}

async function batched<T, R>(
  items: readonly T[],
  size: number,
  run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let from = 0; from < items.length; from += size) {
    const batch = items.slice(from, from + size);
    out.push(
      ...(await Promise.all(batch.map((item, i) => run(item, from + i)))),
    );
  }
  return out;
}

async function readCanon(): Promise<CanonFilm[]> {
  const films = await batched(CANON, 20, async ([imdbId, title, year], i) => {
    const found = await findMovieByImdb(imdbId);
    const movie = found.success ? found.data : null;
    if (!movie?.posterPath) {
      report("Canon", new Error(`No poster for ${imdbId} (${title})`));
      return null;
    }
    if (movie.releaseYear !== null && Math.abs(movie.releaseYear - year) > 1) {
      report(
        "Canon",
        new Error(`${imdbId} is ${movie.title}, expected ${title} (${year})`),
      );
      return null;
    }
    const film: CanonFilm = {
      backdropPath: movie.backdropPath,
      genres: genreNames(movie.genreIds),
      id: movie.id,
      posterPath: movie.posterPath,
      rank: i + 1,
      rating: movie.voteAverage,
      title,
      votes: movie.voteCount,
      year,
    };
    return film;
  });
  return films.filter((film): film is CanonFilm => film !== null);
}

export const getCanon = cache(() => kept("spotlight:canon", readCanon));
