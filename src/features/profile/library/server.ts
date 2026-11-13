import "server-only";

import { paged } from "@/features/profile/params";
import {
  likePattern,
  MEDIA_PAGE_SIZE,
  type MediaFilters,
  type MediaItem,
  type MediaKind,
  type MovieRow,
  type Paged,
  type ProfileClient,
  toMediaItem,
} from "@/features/profile/profile";
import { readPage } from "@/features/profile/server";
import type { MediaType } from "@/lib/tmdb/shared";

interface Filterable<T> {
  contains(column: string, value: unknown): T;
  gte(column: string, value: string): T;
  ilike(column: string, pattern: string): T;
  lt(column: string, value: string): T;
}

const MEDIA_SORT_COLUMNS = {
  added_asc: ["added", true],
  added_desc: ["added", false],
  release_asc: ["release_date", true],
  release_desc: ["release_date", false],
  title_asc: ["title", true],
  title_desc: ["title", false],
} as const;

const MEDIA_TABLES = {
  likes: "account_likes",
  watched: "account_watched",
  watchlist: "account_watchlist",
} as const;

const MOVIE_COLUMNS = "tmdb_id, title, poster_path, release_date";

function filterMovies<T extends Filterable<T>>(
  query: T,
  filters: Pick<MediaFilters, "decade" | "genre" | "query">,
): T {
  let next = query;
  if (filters.query) next = next.ilike("title", likePattern(filters.query));
  if (filters.genre) {
    next = next.contains("payload", { genre_ids: [filters.genre] });
  }
  if (filters.decade) {
    next = next
      .gte("release_date", `${filters.decade}-01-01`)
      .lt("release_date", `${filters.decade + 10}-01-01`);
  }
  return next;
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
  const added = kind === "watched" ? "last_watched_at" : "created_at";

  const query = filterMovies(
    client
      .from(MEDIA_TABLES[kind] as "account_likes")
      .select(MOVIE_COLUMNS, { count: "exact" })
      .eq("account_id", accountId)
      .eq("media_type", mediaType),
    filters,
  );

  const [sortKey, ascending] = MEDIA_SORT_COLUMNS[filters.sort];
  const column = sortKey === "added" ? added : sortKey;

  const [result, favorites] = await Promise.all([
    readPage(
      query
        .order(column as "created_at", { ascending, nullsFirst: false })
        .order("tmdb_id", { ascending: false }),
      filters.page,
      MEDIA_PAGE_SIZE,
    ),
    kind === "likes"
      ? client
          .from("account_favorites")
          .select("tmdb_id")
          .eq("account_id", accountId)
          .eq("media_type", mediaType)
      : null,
  ]);

  const pinned = new Set((favorites?.data ?? []).map((row) => row.tmdb_id));
  return paged(
    (result.rows as MovieRow[]).map((row) =>
      toMediaItem(row, pinned, mediaType),
    ),
    result.count,
    result.page,
    MEDIA_PAGE_SIZE,
  );
}
