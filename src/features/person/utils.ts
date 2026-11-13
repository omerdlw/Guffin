import { headlineClass } from "@/design/foundations/layout";
import type { MediaType } from "@/features/catalog/types";
import { pluralize } from "@/lib/format";
import type {
  PersonCastCredit,
  PersonCrewCredit,
  PersonDetails,
  PersonExternalIds,
  PersonImage,
} from "@/lib/tmdb/shared";
import {
  DEPARTMENT_JOBS,
  DEPARTMENT_ROLES,
  FILMOGRAPHY_SORTS,
  NOT_A_REAL_ROLE,
  PERSON_BIO_CLAMP_LENGTH,
  PERSON_BIO_EXCERPT,
  PERSON_DATE_FORMAT,
  SOCIAL_SOURCES,
} from "./constants";
import type {
  CareerFilm,
  CreditLike,
  FilmographyCredit,
  FilmographyGroup,
  FilmographySort,
  GalleryTab,
  SocialLink,
  SourceCredit,
  TvSourceCredit,
} from "./types";

export const personNameClass = (name: string) =>
  headlineClass(name, [20, 30, 42]);

export function parsePersonId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

export function departmentRole(department: string | null): string | null {
  if (!department) return null;
  return DEPARTMENT_ROLES[department] ?? department;
}

function parseDay(date: string | null): Date | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(date: string | null): string | null {
  const parsed = parseDay(date);
  return parsed ? PERSON_DATE_FORMAT.format(parsed) : null;
}

export function calculateAge(
  birthday: string | null,
  deathday: string | null,
  now: Date = new Date(),
): number | null {
  const birth = parseDay(birthday);
  if (!birth) return null;
  const end = parseDay(deathday) ?? now;

  let age = end.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    end.getUTCMonth() < birth.getUTCMonth() ||
    (end.getUTCMonth() === birth.getUTCMonth() &&
      end.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function lifeSpan(
  person: Pick<PersonDetails, "birthday" | "deathday">,
): string | null {
  const born = person.birthday?.slice(0, 4);
  const died = person.deathday?.slice(0, 4);
  if (born && died) return `${born} - ${died}`;
  if (born) return `Born ${born}`;
  if (died) return `Died ${died}`;
  return null;
}

export function describePerson(
  person: PersonDetails,
  films: number | null = null,
): string {
  return [
    departmentRole(person.knownForDepartment),
    lifeSpan(person),
    films ? pluralize(films, "film") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function getSocialLinks(ids: PersonExternalIds): SocialLink[] {
  return SOCIAL_SOURCES.flatMap((source) => {
    const id = source.id(ids);
    if (!id || !source.pattern.test(id)) return [];
    return [
      {
        icon: source.icon,
        key: source.key,
        label: source.label,
        url: source.url(id),
      },
    ];
  });
}

export function excerptBiography(
  biography: string,
  limit = PERSON_BIO_EXCERPT,
): { text: string; truncated: boolean } {
  const whole = biography.trim();
  if (whole.length <= PERSON_BIO_CLAMP_LENGTH)
    return { text: whole, truncated: false };

  const paragraph = whole.split(/\n{2,}/)[0].trim();
  const base = paragraph.length >= limit / 2 ? paragraph : whole;
  if (base.length <= limit) {
    return { text: base, truncated: base.length < whole.length };
  }

  const cut = base.slice(0, limit);
  const ends = [...cut.matchAll(/[.!?]["')\]]?(?=\s)/g)];
  const last = ends[ends.length - 1];
  if (last && last.index + last[0].length >= limit / 2) {
    return { text: cut.slice(0, last.index + last[0].length), truncated: true };
  }
  const space = cut.lastIndexOf(" ");
  return {
    text: `${cut.slice(0, space > 0 ? space : limit).replace(/[\s,;:.\-–—]+$/, "")}…`,
    truncated: true,
  };
}

export function chartLabelStep(count: number) {
  const steps = [1, 2, 5, 10, 20, 50];
  return steps.find((each) => Math.ceil(count / each) <= 9) ?? 50;
}

export const byPopularity = (a: CreditLike, b: CreditLike) =>
  b.popularity - a.popularity || b.voteCount - a.voteCount;

export const byNewest = (a: CreditLike, b: CreditLike) =>
  (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") ||
  byPopularity(a, b);

function toCredit(
  movie: CreditLike,
  role: string | null,
  mediaType: MediaType,
): FilmographyCredit {
  return {
    ...("episodeCount" in movie && typeof movie.episodeCount === "number"
      ? { episodes: movie.episodeCount }
      : {}),
    id: movie.id,
    key: `${mediaType}:${movie.id}`,
    mediaType,
    popularity: movie.popularity,
    posterPath: movie.posterPath,
    releaseDate: movie.releaseDate,
    role,
    title: movie.title,
    voteCount: movie.voteCount,
    year: movie.releaseYear,
  };
}

export function mergeByMovie<T extends CreditLike>(
  credits: readonly T[],
  roleOf: (credit: T) => string | null,
  mediaType: MediaType = "movie",
): FilmographyCredit[] {
  const merged = new Map<number, { movie: T; roles: string[] }>();
  for (const credit of credits) {
    const role = roleOf(credit);
    const existing = merged.get(credit.id);
    if (!existing) {
      merged.set(credit.id, { movie: credit, roles: role ? [role] : [] });
    } else if (role && !existing.roles.includes(role)) {
      existing.roles.push(role);
    }
  }
  return [...merged.values()].map(({ movie, roles }) =>
    toCredit(movie, roles.length > 0 ? roles.join(" / ") : null, mediaType),
  );
}

export function makeGroup(
  key: string,
  label: string,
  credits: FilmographyCredit[],
): FilmographyGroup {
  const withPoster = credits.filter((credit) => credit.posterPath);
  return { credits: withPoster, key, label, total: withPoster.length };
}

export function crewOfDepartment<T extends { job: string | null }>(
  credits: readonly T[],
  department: string,
): T[] {
  const jobs = DEPARTMENT_JOBS[department];
  const defining = jobs
    ? credits.filter((credit) => credit.job && jobs.test(credit.job))
    : [];
  return defining.length > 0 ? defining : [...credits];
}

export function isFilmographySort(value: unknown): value is FilmographySort {
  return FILMOGRAPHY_SORTS.some((sort) => sort.key === value);
}

function sortableTitle(title: string): string {
  return title.replace(/^(?:the|a|an)\s+/i, "");
}

export const byTitle = (a: FilmographyCredit, b: FilmographyCredit) =>
  sortableTitle(a.title).localeCompare(sortableTitle(b.title), "en", {
    sensitivity: "base",
  });

const standing = (credit: FilmographyCredit) =>
  credit.popularity * (credit.episodes ? Math.log2(1 + credit.episodes) : 1);

export const byCreditPopularity = (
  a: FilmographyCredit,
  b: FilmographyCredit,
) => standing(b) - standing(a) || b.voteCount - a.voteCount;

export function describeCredits(
  cast: readonly { character: string | null }[],
  crew: readonly { department: string | null; job: string | null }[],
  episodes = 0,
): string | null {
  const parts: string[] = [];
  if (cast.length > 0) {
    const characters = [
      ...new Set(cast.map((c) => c.character).filter(Boolean)),
    ];
    parts.push(
      characters.length > 0 ? `as ${characters.join(" / ")}` : "Actor",
    );
  }
  const jobs = [
    ...new Set(crew.map((c) => c.job ?? c.department).filter(Boolean)),
  ];
  if (jobs.length > 0) parts.push(jobs.join(", "));
  if (episodes > 0) parts.push(pluralize(episodes, "episode"));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function careerTitles(credits: readonly CreditLike[]): CareerFilm[] {
  const films = new Map<number, CareerFilm>();
  for (const credit of credits) {
    if (credit.releaseYear === null || films.has(credit.id)) continue;
    films.set(credit.id, {
      id: credit.id,
      popularity: credit.popularity,
      title: credit.title,
      votes: credit.voteCount,
      year: credit.releaseYear,
    });
  }
  return [...films.values()];
}

export const byImpact = (a: CareerFilm, b: CareerFilm) =>
  b.votes - a.votes || b.popularity - a.popularity;

export function backdropScore(
  credit: SourceCredit | TvSourceCredit,
  kind: "cast" | "crew",
): number {
  let weight = 1;
  if ("episodeCount" in credit) {
    const episodes = credit.episodeCount;
    weight = episodes >= 40 ? 1.4 : episodes >= 12 ? 1.1 : 0.7;
    if ("character" in credit && credit.character) {
      if (NOT_A_REAL_ROLE.test(credit.character)) weight *= 0.2;
    } else if ("job" in credit) {
      weight = credit.job === "Creator" ? 1.3 : 0.5;
    }
  } else if (kind === "cast") {
    const { order, character } = credit as PersonCastCredit;
    weight = order === 0 ? 1.6 : order <= 2 ? 1.3 : order <= 5 ? 1 : 0.7;
    if (order > 10) weight = 0.3;
    if (character && NOT_A_REAL_ROLE.test(character)) weight *= 0.2;
  } else {
    weight = (credit as PersonCrewCredit).job === "Director" ? 1.3 : 0.5;
  }
  const impact =
    Math.log10(Math.max(1, credit.voteCount)) * 25 +
    Math.log10(Math.max(1, credit.popularity)) * 10;
  return impact * weight;
}

export const formatYears = (count: number) => `${count} years`;

export const buildGalleryShelves = (
  backdrops: string[],
  portraits: PersonImage[],
): [GalleryTab, string[]][] =>
  (
    [
      [
        "portraits",
        portraits.length > 1 ? portraits.map((p) => p.filePath) : [],
      ],
      ["backdrops", backdrops],
    ] as [GalleryTab, string[]][]
  ).filter(([, paths]) => paths.length > 0);

export const filmCountLabel = (count: number, medium: MediaType = "movie") => {
  const noun = medium === "tv" ? "show" : "film";
  return count === 0 ? `No ${noun}s` : pluralize(count, noun);
};

export function careerFilms(person: PersonDetails): CareerFilm[] {
  return careerTitles([...person.credits.cast, ...person.credits.crew]);
}

export function datedTvCredits(
  credits: readonly TvSourceCredit[],
  eligible: (credits: readonly TvSourceCredit[]) => TvSourceCredit[],
): TvSourceCredit[] {
  return eligible(credits).map((credit) => {
    const releaseDate = credit.firstCreditDate ?? credit.releaseDate;
    return {
      ...credit,
      releaseDate,
      releaseYear: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    };
  });
}
