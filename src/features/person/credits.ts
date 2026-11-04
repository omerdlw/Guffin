import {
  type PersonCastCredit,
  type PersonCrewCredit,
  type PersonDetails,
  type PersonImage,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import {
  GROUP_PRIORITY,
  PERSON_BACKDROP_LIMIT,
  PERSON_BACKDROP_MIN_VOTES,
  PERSON_CAREER_MIN_YEARS,
  PERSON_GALLERY_LIMIT,
  SHOWN_ALONGSIDE,
} from "./constants";
import type {
  Career,
  CareerFilm,
  FilmographyCredit,
  FilmographyGroup,
  FilmographySort,
  SourceCredit,
  TimelineCredit,
  TimelineYear,
} from "./types";
import {
  backdropScore,
  byCreditPopularity,
  byImpact,
  byNewest,
  byPopularity,
  byTitle,
  careerFilms,
  crewOfDepartment,
  departmentRole,
  describeCredits,
  makeGroup,
  mergeByMovie,
} from "./utils";

export function getFilmography(person: PersonDetails): FilmographyGroup[] {
  const groups: FilmographyGroup[] = [];

  groups.push(
    makeGroup(
      "Acting",
      departmentRole("Acting") ?? "Actor",
      mergeByMovie(
        [...person.credits.cast].sort(byPopularity),
        (credit) => credit.character,
      ),
    ),
  );

  const byDepartment = new Map<string, PersonCrewCredit[]>();
  for (const credit of person.credits.crew) {
    const department = credit.department ?? "Crew";
    byDepartment.set(department, [
      ...(byDepartment.get(department) ?? []),
      credit,
    ]);
  }
  for (const [department, credits] of byDepartment) {
    groups.push(
      makeGroup(
        department,
        departmentRole(department) ?? department,
        mergeByMovie(
          crewOfDepartment(credits, department).sort(byPopularity),
          (credit) => credit.job,
        ),
      ),
    );
  }

  const present = groups.filter((group) => group.total > 0);
  const shown = present
    .filter(
      (group) =>
        group.key === person.knownForDepartment ||
        SHOWN_ALONGSIDE.includes(group.key),
    )
    .sort((a, b) => {
      const rank = (group: FilmographyGroup) =>
        group.key === person.knownForDepartment
          ? -1
          : SHOWN_ALONGSIDE.indexOf(group.key);
      return rank(a) - rank(b);
    });
  if (shown.length > 0) return shown;

  const priority = (group: FilmographyGroup) => {
    const index = GROUP_PRIORITY.indexOf(group.key);
    return index === -1 ? GROUP_PRIORITY.length : index;
  };
  const [largest] = present.sort(
    (a, b) => b.total - a.total || priority(a) - priority(b),
  );
  return largest ? [largest] : [];
}

export function sortFilmography(
  credits: readonly FilmographyCredit[],
  sort: FilmographySort,
): FilmographyCredit[] {
  const compare = (a: FilmographyCredit, b: FilmographyCredit): number => {
    switch (sort) {
      case "popularity":
        return 0;
      case "name":
        return byTitle(a, b);
      case "newest":
      case "oldest": {
        if (!a.releaseDate || !b.releaseDate) {
          return Number(!a.releaseDate) - Number(!b.releaseDate);
        }
        const order = a.releaseDate.localeCompare(b.releaseDate);
        return sort === "newest" ? -order : order;
      }
    }
  };
  return [...credits].sort((a, b) => compare(a, b) || byCreditPopularity(a, b));
}

export function getTimeline(person: PersonDetails): TimelineYear[] {
  const films = new Map<
    number,
    { cast: PersonCastCredit[]; crew: PersonCrewCredit[]; movie: SourceCredit }
  >();
  const entry = (movie: SourceCredit) => {
    let film = films.get(movie.id);
    if (!film) {
      film = { cast: [], crew: [], movie };
      films.set(movie.id, film);
    }
    return film;
  };
  person.credits.cast.forEach((credit) => entry(credit).cast.push(credit));
  person.credits.crew.forEach((credit) => entry(credit).crew.push(credit));

  const years = new Map<
    string | null,
    { credit: TimelineCredit; movie: SourceCredit }[]
  >();
  for (const { cast, crew, movie } of films.values()) {
    const year = movie.releaseDate?.slice(0, 4) ?? null;
    years.set(year, [
      ...(years.get(year) ?? []),
      {
        credit: {
          detail: describeCredits(cast, crew),
          id: movie.id,
          key: `${movie.id}`,
          posterPath: movie.posterPath,
          title: movie.title,
        },
        movie,
      },
    ]);
  }

  return [...years.entries()]
    .sort(([a], [b]) => {
      if (a === null || b === null)
        return Number(a === null) - Number(b === null);
      return Number(b) - Number(a);
    })
    .map(([year, items]) => ({
      credits: items
        .sort((a, b) => byNewest(a.movie, b.movie))
        .map((i) => i.credit),
      year,
    }));
}

export function getCareer(person: PersonDetails): Career | null {
  const films = careerFilms(person);
  if (films.length === 0) return null;

  const first = Math.min(...films.map((film) => film.year));
  const last = Math.max(...films.map((film) => film.year));
  const end = Math.max(last, first + PERSON_CAREER_MIN_YEARS - 1);

  const byYear = new Map<number, CareerFilm[]>();
  for (const film of films) {
    byYear.set(film.year, [...(byYear.get(film.year) ?? []), film]);
  }
  const height = (year: number) =>
    (byYear.get(year) ?? []).reduce((n, f) => n + f.votes, 0);

  let tallest = 0;
  let peak = first;
  for (let year = first; year <= end; year++) {
    if (height(year) >= tallest && byYear.has(year)) {
      tallest = height(year);
      peak = year;
    }
  }

  const years = [];
  for (let year = first; year <= end; year++) {
    const here = [...(byYear.get(year) ?? [])].sort(byImpact);
    years.push({
      count: here.length,
      films: here.map((film) => film.title),
      weight:
        tallest > 0
          ? Math.sqrt(height(year) / tallest)
          : here.length > 0
            ? 1
            : 0,
      year,
    });
  }
  return { peak, years };
}

export function countFilms(
  person: PersonDetails,
  now: Date = new Date(),
): number {
  const today = now.getUTCFullYear();
  return careerFilms(person).filter((film) => film.year <= today).length;
}

export function getBackdropPaths(
  person: PersonDetails,
  limit = PERSON_BACKDROP_LIMIT,
): string[] {
  const best = new Map<number, { path: string; score: number }>();
  const consider = (credit: SourceCredit, kind: "cast" | "crew") => {
    if (!credit.backdropPath || credit.voteCount < PERSON_BACKDROP_MIN_VOTES) {
      return;
    }
    const score = backdropScore(credit, kind);
    const known = best.get(credit.id);
    if (!known || score > known.score) {
      best.set(credit.id, { path: credit.backdropPath, score });
    }
  };
  person.credits.cast.forEach((credit) => consider(credit, "cast"));
  person.credits.crew.forEach((credit) => consider(credit, "crew"));

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ path }) => path);
}

export function getBackdropPath(person: PersonDetails): string | null {
  return getBackdropPaths(person, 1)[0] ?? null;
}

export function personSwatch(
  backdropPath: string | null,
  photoPath: string | null,
): string | null {
  return (
    tmdbImageUrl("backdrop", backdropPath, "w300") ??
    tmdbImageUrl("profile", photoPath, "w185")
  );
}

export function getGalleryImages(
  person: PersonDetails,
  limit = PERSON_GALLERY_LIMIT,
): PersonImage[] {
  return [...person.images.profiles]
    .sort((a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount)
    .slice(0, limit);
}
