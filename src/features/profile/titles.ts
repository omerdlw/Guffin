import "server-only";

import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { filmCatalog } from "@/infrastructure/db/schema";
import { TMDB_GENRES } from "@/infrastructure/tmdb/genres";
import type { TitleFacets, TitleFilters } from "./filters";

export function contains(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function genreIds(payload: AnyColumn): SQL<number[]> {
  return sql<number[]>`case
    when jsonb_typeof(${payload} -> 'genre_ids') = 'array'
      and jsonb_array_length(${payload} -> 'genre_ids') > 0
    then array(select jsonb_array_elements_text(${payload} -> 'genre_ids')::int)
    else coalesce(${filmCatalog.genreIds}, '{}'::int[])
  end`;
}

export function titleConditions(
  filters: TitleFilters,
  columns: { genres: unknown; release: unknown; title: unknown },
): (SQL | undefined)[] {
  const text = filters.query.trim();
  const { decade, genre } = filters;
  return [
    text ? sql`${columns.title} ilike ${contains(text)}` : undefined,
    genre !== null
      ? sql`${columns.genres} @> array[${genre}]::int[]`
      : undefined,
    decade !== null
      ? sql`extract(year from ${columns.release}) between ${decade} and ${decade + 9}`
      : undefined,
  ];
}

export function toFacets(
  rows: { genreIds: number[] | null; releaseDate: string | null }[],
): TitleFacets {
  const names = TMDB_GENRES;
  const genres = new Map<number, number>();
  const decades = new Set<number>();
  for (const row of rows) {
    for (const id of row.genreIds ?? []) {
      if (names[id]) genres.set(id, (genres.get(id) ?? 0) + 1);
    }
    const year = Number(row.releaseDate?.slice(0, 4));
    if (year > 0) decades.add(Math.floor(year / 10) * 10);
  }
  return {
    decades: [...decades].sort((a, b) => b - a),
    genres: [...genres]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => ({ id, label: names[id] })),
  };
}
