import "server-only";
import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { getRedisClient } from "@/lib/security";
import {
  findMovieByImdb,
  getMovieDetails,
  getPersonDetails,
  searchMovies,
} from "@/lib/tmdb/server";
import {
  BEST_PICTURE,
  CANON,
  CATALOG_FRESH_MS,
  CATALOG_KEEP_SECONDS,
  DIRECTORS,
} from "./constants";
import type { CanonFilm, Director, Kept, Laureate } from "./types";
import {
  ceremonyYear,
  filmographyOf,
  genreNames,
  loglineOf,
  winnerAmong,
} from "./utils";

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

async function readDirectors(): Promise<Director[]> {
  const directors = await batched(DIRECTORS, 5, async (entry, i) => {
    const person = await getPersonDetails(entry.person);
    const films = person.success ? filmographyOf(person.data.credits.crew) : [];
    const profilePath = person.success ? person.data.profilePath : null;
    if (films.length === 0 || !profilePath) {
      report("Directors", new Error(`Incomplete: ${entry.name}`));
      return null;
    }
    const director: Director = {
      born: entry.born,
      died: entry.died,
      films,
      id: entry.person,
      name: entry.name,
      place: person.success ? person.data.placeOfBirth : null,
      profilePath,
      rank: i + 1,
    };
    return director;
  });
  return directors.filter(
    (director): director is Director => director !== null,
  );
}

export const getDirectors = cache(() =>
  kept("spotlight:directors", readDirectors),
);

async function readLaureates(): Promise<Laureate[]> {
  const films = await batched(BEST_PICTURE, 20, async ([title, year], i) => {
    const found = await searchMovies(title);
    const movie = found.success
      ? winnerAmong(found.data.results, title, year)
      : null;
    if (!movie?.posterPath) {
      report("Laureates", new Error(`No film for ${title} (${year})`));
      return null;
    }
    const details = await getMovieDetails(movie.id);
    const film = details.success ? details.data : null;
    const ceremony = i + 1;
    const laureate: Laureate = {
      backdropPath: movie.backdropPath,
      ceremony,
      ceremonyYear: ceremonyYear(ceremony),
      director:
        film?.credits.crew.find((member) => member.job === "Director")?.name ??
        null,
      genres: film
        ? film.genres.map((genre) => genre.name).slice(0, 3)
        : genreNames(movie.genreIds),
      honoured: year,
      id: movie.id,
      logline: loglineOf(film?.overview),
      posterPath: movie.posterPath,
      runtime: film?.runtimeMinutes ?? null,
      tagline: film?.tagline?.trim() || null,
      title,
      year: movie.releaseYear,
    };
    return laureate;
  });
  return films.filter((film): film is Laureate => film !== null);
}

export const getLaureates = cache(() =>
  kept("spotlight:laureates", readLaureates),
);
