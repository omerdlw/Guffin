import { readParam, type SearchParams } from "@/shared/http";
import type { ToolbarField } from "./components/toolbar";

const SORT_PARAM = "sort";
export const QUERY_PARAM = "q";
const GENRE_PARAM = "genre";
const DECADE_PARAM = "decade";

const ANY = "any";

const QUERY_MAX = 100;

export interface TitleFilters {
  decade: number | null;
  genre: number | null;
  query: string;
}

export interface TitleFacets {
  decades: number[];
  genres: { id: number; label: string }[];
}

export function readQuery(query: SearchParams): string {
  return readParam(query, QUERY_PARAM).slice(0, QUERY_MAX);
}

export function readSort<S extends string>(
  query: SearchParams,
  sorts: Record<S, string>,
  fallback: S,
): S {
  const value = readParam(query, SORT_PARAM);
  return value in sorts ? (value as S) : fallback;
}

function readNumber(query: SearchParams, key: string): number | null {
  const value = Number(readParam(query, key));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function readTitleFilters(query: SearchParams): TitleFilters {
  const decade = readNumber(query, DECADE_PARAM);
  return {
    decade: decade !== null && decade % 10 === 0 ? decade : null,
    genre: readNumber(query, GENRE_PARAM),
    query: readQuery(query),
  };
}

export function cleanTitleFilters(filters: TitleFilters): TitleFilters {
  const whole = (value: unknown) =>
    Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
  const decade = whole(filters.decade);
  return {
    decade: decade !== null && decade % 10 === 0 ? decade : null,
    genre: whole(filters.genre),
    query: String(filters.query ?? "").slice(0, QUERY_MAX),
  };
}

export const isNarrowed = (filters: TitleFilters): boolean =>
  filters.query !== "" || filters.genre !== null || filters.decade !== null;

export function titleFields<S extends string>({
  facets,
  fallback,
  filters,
  sort,
  sorts,
}: {
  facets: TitleFacets;
  fallback: S;
  filters: TitleFilters;
  sort: S;
  sorts: Record<S, string>;
}): ToolbarField[] {
  return [
    {
      fallback: ANY,
      key: GENRE_PARAM,
      label: "Genre",
      options: [
        { label: "Any genre", value: ANY },
        ...facets.genres.map((genre) => ({
          label: genre.label,
          value: String(genre.id),
        })),
      ],
      value: filters.genre === null ? ANY : String(filters.genre),
    },
    {
      fallback: ANY,
      key: DECADE_PARAM,
      label: "Decade",
      options: [
        { label: "Any decade", value: ANY },
        ...facets.decades.map((decade) => ({
          label: `${decade}s`,
          value: String(decade),
        })),
      ],
      value: filters.decade === null ? ANY : String(filters.decade),
    },
    sortField(sorts, sort, fallback),
  ];
}

export function sortField<S extends string>(
  sorts: Record<S, string>,
  sort: S,
  fallback: S,
): ToolbarField {
  return {
    fallback,
    key: SORT_PARAM,
    label: "Order",
    options: (Object.keys(sorts) as S[]).map((value) => ({
      label: sorts[value],
      value,
    })),
    value: sort,
  };
}
