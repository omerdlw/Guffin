import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  type SQL,
  sql,
} from "drizzle-orm";
import { paged } from "@/features/profile/params";
import {
  likePattern,
  MEDIA_PAGE_SIZE,
  type MediaFilters,
  type MediaItem,
  type MediaKind,
  type Paged,
  type ProfileClient,
  toMediaItem,
} from "@/features/profile/profile";
import { readPage } from "@/features/profile/server";
import {
  accountFavorites,
  accountLikes,
  accountWatched,
  accountWatchlist,
} from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb/shared";

const MEDIA_TABLES = {
  likes: accountLikes,
  watched: accountWatched,
  watchlist: accountWatchlist,
} as const;

type MediaTable = (typeof MEDIA_TABLES)[MediaKind];

function filterMovies(
  table: MediaTable,
  filters: Pick<MediaFilters, "decade" | "genre" | "query">,
): (SQL | undefined)[] {
  const conditions: (SQL | undefined)[] = [];
  if (filters.query) {
    conditions.push(ilike(table.title, likePattern(filters.query)));
  }
  if (filters.genre) {
    conditions.push(
      sql`${table.payload} @> ${JSON.stringify({ genre_ids: [filters.genre] })}::jsonb`,
    );
  }
  if (filters.decade) {
    conditions.push(
      gte(table.releaseDate, `${filters.decade}-01-01`),
      lt(table.releaseDate, `${filters.decade + 10}-01-01`),
    );
  }
  return conditions;
}

function mediaOrder(
  table: MediaTable,
  kind: MediaKind,
  sort: MediaFilters["sort"],
): SQL {
  const added =
    kind === "watched" ? accountWatched.lastWatchedAt : table.createdAt;
  const [column, direction] = {
    added_asc: [added, sql`asc`],
    added_desc: [added, sql`desc`],
    release_asc: [table.releaseDate, sql`asc`],
    release_desc: [table.releaseDate, sql`desc`],
    title_asc: [table.title, sql`asc`],
    title_desc: [table.title, sql`desc`],
  }[sort];
  return sql`${column} ${direction} nulls last`;
}

export async function getMediaPage({
  accountId,
  client,
  filters,
  kind,
  mediaType = "movie",
}: {
  accountId: string;
  client: ProfileClient;
  filters: MediaFilters;
  kind: MediaKind;
  mediaType?: MediaType;
}): Promise<Paged<MediaItem>> {
  const table = MEDIA_TABLES[kind];
  const where = and(
    eq(table.accountId, accountId),
    eq(table.mediaType, mediaType),
    ...filterMovies(table, filters),
  );

  const [result, favorites] = await Promise.all([
    readPage(
      {
        count: async () => {
          const [row] = await client.db
            .select({ total: count() })
            .from(table)
            .where(where);
          return row?.total ?? 0;
        },
        rows: (limit, offset) =>
          client.db
            .select({
              poster_path: table.posterPath,
              release_date: table.releaseDate,
              title: table.title,
              tmdb_id: table.tmdbId,
            })
            .from(table)
            .where(where)
            .orderBy(mediaOrder(table, kind, filters.sort), desc(table.tmdbId))
            .limit(limit)
            .offset(offset),
      },
      filters.page,
      MEDIA_PAGE_SIZE,
    ),
    kind === "likes"
      ? client.db
          .select({ tmdbId: accountFavorites.tmdbId })
          .from(accountFavorites)
          .where(
            and(
              eq(accountFavorites.accountId, accountId),
              eq(accountFavorites.mediaType, mediaType),
            ),
          )
      : [],
  ]);

  const pinned = new Set(favorites.map((row) => row.tmdbId));
  return paged(
    result.rows.map((row) => toMediaItem(row, pinned, mediaType)),
    result.count,
    result.page,
    MEDIA_PAGE_SIZE,
  );
}
