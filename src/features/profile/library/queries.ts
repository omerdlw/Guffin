import "server-only";

import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import type { Session } from "@/infrastructure/db/client";
import {
  accountFavorites,
  accountLikes,
  accountWatched,
  accountWatchlist,
  filmCatalog,
} from "@/infrastructure/db/schema";
import type { TitleFacets } from "../filters";
import { genreIds, titleConditions, toFacets } from "../titles";
import {
  LIBRARY_PAGE_SIZE,
  type LibraryFilters,
  type LibraryKind,
  type LibraryPage,
  type LibrarySort,
} from "./model";

const TABLES = {
  likes: accountLikes,
  watched: accountWatched,
  watchlist: accountWatchlist,
} as const;

function shelf(session: Session, kind: LibraryKind, accountId: string) {
  const table = TABLES[kind];
  return session.db
    .select({
      addedAt: sql<string>`${
        kind === "watched" ? accountWatched.lastWatchedAt : table.createdAt
      }`.as("added_at"),
      genreIds: genreIds(table.payload).as("genre_ids"),
      posterPath: table.posterPath,
      releaseDate: table.releaseDate,
      title: table.title,
      tmdbId: table.tmdbId,
    })
    .from(table)
    .leftJoin(filmCatalog, eq(filmCatalog.tmdbId, table.tmdbId))
    .where(eq(table.accountId, accountId))
    .as("shelf");
}

export async function getLibraryPage({
  accountId,
  filters,
  kind,
  offset = 0,
  session,
}: {
  accountId: string;
  filters: LibraryFilters;
  kind: LibraryKind;
  offset?: number;
  session: Session;
}): Promise<LibraryPage> {
  const rows = shelf(session, kind, accountId);
  const order: Record<LibrarySort, SQL> = {
    added_asc: sql`${rows.addedAt} asc`,
    added_desc: sql`${rows.addedAt} desc`,
    release_asc: sql`${rows.releaseDate} asc nulls last`,
    release_desc: sql`${rows.releaseDate} desc nulls last`,
    title: sql`lower(${rows.title}) asc`,
  };
  const [page, pinned] = await Promise.all([
    session.db
      .select({
        posterPath: rows.posterPath,
        releaseDate: rows.releaseDate,
        title: rows.title,
        tmdbId: rows.tmdbId,
      })
      .from(rows)
      .where(
        and(
          ...titleConditions(filters, {
            genres: rows.genreIds,
            release: rows.releaseDate,
            title: rows.title,
          }),
        ),
      )
      .orderBy(order[filters.sort], desc(rows.tmdbId))
      .limit(LIBRARY_PAGE_SIZE + 1)
      .offset(offset),
    kind === "likes"
      ? session.db
          .select({ tmdbId: accountFavorites.tmdbId })
          .from(accountFavorites)
          .where(eq(accountFavorites.accountId, accountId))
      : Promise.resolve([]),
  ]);
  const favorites = new Set(pinned.map((row) => row.tmdbId));

  return {
    items: page.slice(0, LIBRARY_PAGE_SIZE).map((row) => ({
      pinned: favorites.has(row.tmdbId),
      posterPath: row.posterPath,
      title: row.title,
      tmdbId: row.tmdbId,
      year: row.releaseDate?.slice(0, 4) ?? null,
    })),
    next: page.length > LIBRARY_PAGE_SIZE ? offset + LIBRARY_PAGE_SIZE : null,
  };
}

export async function getLibraryFacets({
  accountId,
  kind,
  session,
}: {
  accountId: string;
  kind: LibraryKind;
  session: Session;
}): Promise<TitleFacets | null> {
  const rows = shelf(session, kind, accountId);
  const all = await session.db
    .select({ genreIds: rows.genreIds, releaseDate: rows.releaseDate })
    .from(rows);
  return all.length > 0 ? toFacets(all) : null;
}
