import type { MediaType } from "@/features/catalog/types";
import { filterEligible } from "@/features/catalog/utils";
import { TV_ENABLED } from "@/lib/env";
import { pluralize } from "@/lib/format";
import {
  type PersonDetails,
  type PersonImage,
  type PersonTvCastCredit,
  type PersonTvCrewCredit,
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
  ByMedium,
  Career,
  CareerFilm,
  CreditLike,
  FilmographyCredit,
  FilmographyGroup,
  FilmographySort,
  SourceCredit,
  TimelineCredit,
  TimelineYear,
  TvSourceCredit,
} from "./types";
import {
  backdropScore,
  byCreditPopularity,
  byImpact,
  byNewest,
  byPopularity,
  byTitle,
  careerFilms,
  careerTitles,
  crewOfDepartment,
  datedTvCredits,
  departmentRole,
  describeCredits,
  makeGroup,
  mergeByMovie,
} from "./utils";

function tvCredits(person: PersonDetails): {
  cast: PersonTvCastCredit[];
  crew: PersonTvCrewCredit[];
} {
  if (!TV_ENABLED) return { cast: [], crew: [] };
  return {
    cast: datedTvCredits(person.tvCredits.cast, (credits) =>
      filterEligible(credits, "tv", "search"),
    ) as PersonTvCastCredit[],
    crew: datedTvCredits(person.tvCredits.crew, (credits) =>
      filterEligible(credits, "tv", "search"),
    ) as PersonTvCrewCredit[],
  };
}

function groupFilmography<
  Cast extends CreditLike & { character: string | null },
  Crew extends CreditLike & { department: string | null; job: string | null },
>(
  cast: readonly Cast[],
  crew: readonly Crew[],
  knownFor: string | null,
  mediaType: MediaType,
  roleOf: (credit: Cast) => string | null = (credit) => credit.character,
): FilmographyGroup[] {
  const groups: FilmographyGroup[] = [];

  groups.push(
    makeGroup(
      "Acting",
      departmentRole("Acting") ?? "Actor",
      mergeByMovie([...cast].sort(byPopularity), roleOf, mediaType),
    ),
  );

  const byDepartment = new Map<string, Crew[]>();
  for (const credit of crew) {
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
          mediaType,
        ),
      ),
    );
  }

  const present = groups.filter((group) => group.total > 0);
  const shown = present
    .filter(
      (group) => group.key === knownFor || SHOWN_ALONGSIDE.includes(group.key),
    )
    .sort((a, b) => {
      const rank = (group: FilmographyGroup) =>
        group.key === knownFor ? -1 : SHOWN_ALONGSIDE.indexOf(group.key);
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

export function getFilmography(
  person: PersonDetails,
): ByMedium<FilmographyGroup[]> {
  const tv = tvCredits(person);
  return {
    movie: groupFilmography(
      person.credits.cast,
      person.credits.crew,
      person.knownForDepartment,
      "movie",
    ),
    tv: groupFilmography(
      tv.cast,
      tv.crew,
      person.knownForDepartment,
      "tv",
      (credit) =>
        [credit.character, pluralize(credit.episodeCount, "episode")]
          .filter(Boolean)
          .join(" · ") || null,
    ),
  };
}

export function getMedia(person: PersonDetails): MediaType[] {
  const filmography = getFilmography(person);
  return (["movie", "tv"] as const).filter(
    (medium) => filmography[medium].length > 0,
  );
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
  type Entry = {
    cast: { character: string | null }[];
    crew: { department: string | null; job: string | null }[];
    episodes: number;
    mediaType: MediaType;
    title: CreditLike;
  };
  const titles = new Map<string, Entry>();
  const entry = (title: CreditLike, mediaType: MediaType) => {
    const key = `${mediaType}:${title.id}`;
    let found = titles.get(key);
    if (!found) {
      found = { cast: [], crew: [], episodes: 0, mediaType, title };
      titles.set(key, found);
    }
    return found;
  };
  person.credits.cast.forEach((c) => entry(c, "movie").cast.push(c));
  person.credits.crew.forEach((c) => entry(c, "movie").crew.push(c));
  const tv = tvCredits(person);
  for (const credit of tv.cast) {
    const found = entry(credit, "tv");
    found.cast.push(credit);
    found.episodes = Math.max(found.episodes, credit.episodeCount);
  }
  for (const credit of tv.crew) entry(credit, "tv").crew.push(credit);

  const years = new Map<
    string | null,
    { credit: TimelineCredit; title: CreditLike }[]
  >();
  for (const { cast, crew, episodes, mediaType, title } of titles.values()) {
    const year = title.releaseDate?.slice(0, 4) ?? null;
    years.set(year, [
      ...(years.get(year) ?? []),
      {
        credit: {
          detail: describeCredits(cast, crew, episodes),
          id: title.id,
          key: `${mediaType}:${title.id}`,
          mediaType,
          posterPath: title.posterPath,
          title: title.title,
        },
        title,
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
        .sort((a, b) => byNewest(a.title, b.title))
        .map((i) => i.credit),
      year,
    }));
}

export function getCareer(person: PersonDetails): ByMedium<Career | null> {
  const tv = tvCredits(person);
  return {
    movie: buildCareer(
      careerTitles([...person.credits.cast, ...person.credits.crew]),
    ),
    tv: buildCareer(careerTitles([...tv.cast, ...tv.crew])),
  };
}

function buildCareer(films: CareerFilm[]): Career | null {
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
  const best = new Map<string, { path: string; score: number }>();
  const consider = (
    credit: SourceCredit | TvSourceCredit,
    kind: "cast" | "crew",
  ) => {
    if (!credit.backdropPath || credit.voteCount < PERSON_BACKDROP_MIN_VOTES) {
      return;
    }
    const score = backdropScore(credit, kind);
    const key = `${"episodeCount" in credit ? "tv" : "movie"}:${credit.id}`;
    const known = best.get(key);
    if (!known || score > known.score) {
      best.set(key, { path: credit.backdropPath, score });
    }
  };
  person.credits.cast.forEach((credit) => consider(credit, "cast"));
  person.credits.crew.forEach((credit) => consider(credit, "crew"));
  const tv = tvCredits(person);
  tv.cast.forEach((credit) => consider(credit, "cast"));
  tv.crew.forEach((credit) => consider(credit, "crew"));

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

export interface KnownTitle {
  id: number;
  mediaType: MediaType;
  posterPath: string;
  title: string;
}

export function getKnownFor(
  person: PersonDetails,
  kind: "cast" | "crew",
  skip: { id: number; mediaType: MediaType },
  limit: number,
): KnownTitle[] {
  const best = new Map<string, KnownTitle & { score: number }>();
  const consider = (credit: SourceCredit | TvSourceCredit) => {
    const mediaType: MediaType = "episodeCount" in credit ? "tv" : "movie";
    if (!credit.posterPath) return;
    if (credit.id === skip.id && mediaType === skip.mediaType) return;
    const score = backdropScore(credit, kind);
    const key = `${mediaType}:${credit.id}`;
    const known = best.get(key);
    if (known && known.score >= score) return;
    best.set(key, {
      id: credit.id,
      mediaType,
      posterPath: credit.posterPath,
      score,
      title: credit.title,
    });
  };
  person.credits[kind].forEach(consider);
  tvCredits(person)[kind].forEach(consider);

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...title }) => title);
}
