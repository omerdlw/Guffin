import "server-only";

import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { bayesianRating, filterEligible } from "@/features/catalog/quality";
import { toLogline } from "@/lib/format";
import { getRedisClient } from "@/lib/security";
import {
  findMovieByImdb,
  getMovieDetails,
  getPersonDetails,
  getShowList,
  searchMovies,
} from "@/lib/tmdb/server";
import type { MovieSearchPage, PersonCrewCredit } from "@/lib/tmdb/shared";
import { BEST_PICTURE, CANON, DIRECTORS } from "./catalog";
import {
  type CanonFilm,
  type Director,
  type DirectorFilm,
  type Laureate,
  SHOW_CANON_SIZE,
} from "./spotlights";

interface Kept<T> {
  at: number;
  value: T;
}

type CatalogHit = MovieSearchPage["results"][number];

const MAX_FILMS = 64;

const GENRE_LABELS: Readonly<Record<number, string>> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Sci-Fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie",
};

const FIRST_CEREMONY_YEAR = 1929;

const CATALOG_FRESH_MS = 24 * 60 * 60_000;

const CATALOG_KEEP_SECONDS = 7 * 24 * 60 * 60;

const SPOTLIGHT_LOGLINE_LENGTH = 200;

const SPOTLIGHT_LOGLINE_ENOUGH = 90;

const SPOTLIGHT_GENRE_LIMIT = 3;

const DIRECTOR_KNOWN_VOTES = 50;

const SHOW_CANON_PAGES = 15;

const SHOW_CANON_PRIOR = Object.freeze({
  mean: 7,
  minVotes: 500,
  weight: 2000,
});

const genreNames = (ids: readonly number[]) =>
  ids
    .flatMap((id) => (GENRE_LABELS[id] ? [GENRE_LABELS[id]] : []))
    .slice(0, SPOTLIGHT_GENRE_LIMIT);

const ceremonyYear = (ceremony: number) =>
  FIRST_CEREMONY_YEAR + ceremony - (ceremony >= 3 && ceremony <= 5 ? 2 : 1);

const spotlightLogline = (overview: string | null | undefined) =>
  toLogline(overview, SPOTLIGHT_LOGLINE_LENGTH, SPOTLIGHT_LOGLINE_ENOUGH);

function filmographyOf(crew: readonly PersonCrewCredit[]): DirectorFilm[] {
  const today = new Date().toISOString().slice(0, 10);
  const byTitle = new Map<string, PersonCrewCredit>();
  for (const credit of crew) {
    if (credit.job !== "Director" || !credit.posterPath) continue;
    if (!credit.releaseDate || credit.releaseDate > today) continue;
    if (credit.voteCount < DIRECTOR_KNOWN_VOTES) continue;
    const key = credit.title.toLowerCase();
    const held = byTitle.get(key);
    if (!held || held.voteCount < credit.voteCount) byTitle.set(key, credit);
  }
  return [...byTitle.values()]
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, MAX_FILMS)
    .map((credit) => ({
      id: credit.id,
      posterPath: credit.posterPath!,
      title: credit.title,
      year: credit.releaseYear,
    }));
}

const normalTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function winnerAmong(
  found: readonly CatalogHit[],
  title: string,
  year: number,
): CatalogHit | null {
  const wanted = normalTitle(title);
  const fits = found.filter(
    (movie) =>
      movie.posterPath !== null &&
      movie.releaseYear !== null &&
      Math.abs(movie.releaseYear - year) <= 1 &&
      [movie.title, movie.originalTitle].some((name) => {
        const have = normalTitle(name ?? "");
        return (
          have === wanted || have.startsWith(wanted) || wanted.startsWith(have)
        );
      }),
  );
  return fits.sort((a, b) => b.voteCount - a.voteCount)[0] ?? null;
}

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

async function readShowCanon(): Promise<CanonFilm[]> {
  const pages = await Promise.all(
    Array.from({ length: SHOW_CANON_PAGES }, (_, i) =>
      getShowList("top_rated", { page: i + 1 }),
    ),
  );
  const shows = filterEligible(
    pages.flatMap((page) => (page.success ? page.data.results : [])),
    "tv",
  );
  const { mean, minVotes, weight } = SHOW_CANON_PRIOR;
  const standing = (show: (typeof shows)[number]) =>
    bayesianRating(show.voteAverage, show.voteCount, weight, mean);
  const seen = new Set<number>();
  return shows
    .filter((show) => {
      if (!show.posterPath || show.voteCount < minVotes) return false;
      if (seen.has(show.id)) return false;
      seen.add(show.id);
      return true;
    })
    .sort((a, b) => standing(b) - standing(a))
    .slice(0, SHOW_CANON_SIZE)
    .map((show, i) => ({
      backdropPath: show.backdropPath,
      genres: genreNames(show.genreIds),
      id: show.id,
      mediaType: "tv",
      posterPath: show.posterPath!,
      rank: i + 1,
      rating: show.voteAverage,
      title: show.title,
      votes: show.voteCount,
      year: show.releaseYear,
    }));
}

export const getShowCanon = cache(() =>
  kept("spotlight:canon:tv", readShowCanon),
);

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
  kept("spotlight:directors:famous", readDirectors),
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
        ? film.genres.map((genre) => genre.name).slice(0, SPOTLIGHT_GENRE_LIMIT)
        : genreNames(movie.genreIds),
      honoured: year,
      id: movie.id,
      logline: spotlightLogline(film?.overview),
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
