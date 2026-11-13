import { pluralize } from "@/lib/format";
import type { MediaType, PersonDetails } from "@/lib/tmdb/shared";

export interface FilmographyCredit {
  episodes?: number;
  id: number;
  key: string;
  mediaType: MediaType;
  popularity: number;
  posterPath: string | null;
  releaseDate: string | null;
  role: string | null;
  title: string;
  voteCount: number;
  year: number | null;
}

export type FilmographySort = "popularity" | "newest" | "oldest" | "name";

export interface FilmographyGroup {
  credits: FilmographyCredit[];
  key: string;
  label: string;
  total: number;
}

export interface TimelineCredit {
  detail: string | null;
  id: number;
  key: string;
  mediaType: MediaType;
  posterPath: string | null;
  title: string;
}

export interface TimelineYear {
  credits: TimelineCredit[];
  year: string | null;
}

export interface SocialLink {
  icon: string;
  key: string;
  label: string;
  url: string;
}

export interface CareerYear {
  count: number;
  films: string[];
  weight: number;
  year: number;
}

export interface Career {
  peak: number;
  years: CareerYear[];
}

export type ByMedium<T> = Record<MediaType, T>;

export const PERSON_FILMOGRAPHY_PREVIEW = 24;

export const PERSON_LINKS_CLASS = "-my-2.5 -mr-2 flex shrink-0 gap-1";

export const FILMOGRAPHY_GRID_CLASS =
  "grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-4";

const DEPARTMENT_ROLES: Readonly<Record<string, string>> = {
  Acting: "Actor",
  Directing: "Director",
  Writing: "Writer",
  Production: "Producer",
  Editing: "Editor",
  Camera: "Cinematographer",
  Sound: "Sound",
  Art: "Art",
  "Costume & Make-Up": "Costume & Make-Up",
  "Visual Effects": "Visual Effects",
  Lighting: "Lighting",
  Creator: "Creator",
  Crew: "Crew",
};

export function parsePersonId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

export function departmentRole(department: string | null): string | null {
  if (!department) return null;
  return DEPARTMENT_ROLES[department] ?? department;
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
