import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { readListPreviews } from "@/features/lists/queries";
import type { Session } from "@/infrastructure/db/client";
import {
  accounts,
  listItems,
  listLikes,
  lists,
  filmCatalog,
  reviewLikes,
  reviews,
} from "@/infrastructure/db/schema";
import type { TitleFacets } from "../filters";
import { contains, genreIds, titleConditions, toFacets } from "../titles";
import {
  LIST_COMMENTS_SHOWN,
  LIST_ITEMS_PAGE_SIZE,
  type EntrySort,
  type EntryFilters,
  type ListComment,
  type ListDetail,
  type ListEntriesPage,
  type ListSort,
  type ListsPage,
  LISTS_PAGE_SIZE,
} from "./model";

const ORDER: Record<ListSort, SQL> = {
  items: sql`${lists.itemsCount} desc`,
  likes: sql`${lists.likesCount} desc`,
  newest: sql`${lists.createdAt} desc`,
  title: sql`lower(${lists.title}) asc`,
  updated: sql`${lists.updatedAt} desc`,
};

const PREVIEW_POSTERS = 5;

const COLUMNS = {
  description: lists.description,
  id: lists.id,
  isPrivate: lists.isPrivate,
  isRanked: lists.isRanked,
  itemsCount: lists.itemsCount,
  likesCount: lists.likesCount,
  reviewsCount: lists.reviewsCount,
  slug: lists.slug,
  title: lists.title,
  updatedAt: lists.updatedAt,
};

export async function getListsPage({
  accountId,
  offset = 0,
  query = "",
  session,
  sort,
}: {
  accountId: string;
  offset?: number;
  query?: string;
  session: Session;
  sort: ListSort;
}): Promise<ListsPage> {
  const text = query.trim();
  const rows = await session.db
    .select(COLUMNS)
    .from(lists)
    .where(
      and(
        eq(lists.accountId, accountId),
        text
          ? or(
              ilike(lists.title, contains(text)),
              ilike(lists.description, contains(text)),
            )
          : undefined,
      ),
    )
    .orderBy(ORDER[sort], desc(lists.updatedAt), asc(lists.id))
    .limit(LISTS_PAGE_SIZE + 1)
    .offset(offset);

  const page = rows.slice(0, LISTS_PAGE_SIZE);
  const previews = await readListPreviews(
    session,
    page.map((row) => row.id),
    PREVIEW_POSTERS,
  );
  return {
    items: page.map((row) => ({
      ...row,
      previews: previews.get(row.id) ?? [],
    })),
    next: rows.length > LISTS_PAGE_SIZE ? offset + LISTS_PAGE_SIZE : null,
  };
}

export async function getListDetail({
  accountId,
  session,
  slug,
  viewerId,
}: {
  accountId: string;
  session: Session;
  slug: string;
  viewerId: string | null;
}): Promise<ListDetail | null> {
  const [row] = await session.db
    .select({
      ...COLUMNS,
      posterPath: lists.posterPath,
    })
    .from(lists)
    .where(and(eq(lists.accountId, accountId), eq(lists.slug, slug)))
    .limit(1);
  if (!row) return null;

  const liked = viewerId
    ? (
        await session.db
          .select({ id: listLikes.listId })
          .from(listLikes)
          .where(
            and(
              eq(listLikes.listId, row.id),
              eq(listLikes.accountId, viewerId),
            ),
          )
          .limit(1)
      ).length > 0
    : false;

  return { ...row, liked };
}

function rankedItems(session: Session, listId: string) {
  return session.db
    .select({
      addedAt: sql<string>`${listItems.createdAt}`.as("added_at"),
      genreIds: genreIds(listItems.payload).as("genre_ids"),
      place:
        sql<number>`row_number() over (order by ${listItems.position}, ${listItems.createdAt})`
          .mapWith(Number)
          .as("place"),
      posterPath: listItems.posterPath,
      releaseDate: listItems.releaseDate,
      title: listItems.title,
      tmdbId: listItems.tmdbId,
    })
    .from(listItems)
    .leftJoin(filmCatalog, eq(filmCatalog.tmdbId, listItems.tmdbId))
    .where(eq(listItems.listId, listId))
    .as("ranked");
}

export async function getListEntries({
  filters,
  listId,
  offset = 0,
  session,
}: {
  filters: EntryFilters;
  listId: string;
  offset?: number;
  session: Session;
}): Promise<ListEntriesPage> {
  const ranked = rankedItems(session, listId);
  const order: Record<EntrySort, SQL> = {
    added: sql`${ranked.addedAt} desc`,
    position: sql`${ranked.place} asc`,
    release_asc: sql`${ranked.releaseDate} asc nulls last`,
    release_desc: sql`${ranked.releaseDate} desc nulls last`,
    title: sql`lower(${ranked.title}) asc`,
  };
  const rows = await session.db
    .select({
      place: ranked.place,
      posterPath: ranked.posterPath,
      releaseDate: ranked.releaseDate,
      title: ranked.title,
      tmdbId: ranked.tmdbId,
    })
    .from(ranked)
    .where(
      and(
        ...titleConditions(filters, {
          genres: ranked.genreIds,
          release: ranked.releaseDate,
          title: ranked.title,
        }),
      ),
    )
    .orderBy(order[filters.sort], asc(ranked.place))
    .limit(LIST_ITEMS_PAGE_SIZE + 1)
    .offset(offset);

  return {
    items: rows.slice(0, LIST_ITEMS_PAGE_SIZE).map((row) => ({
      place: row.place,
      posterPath: row.posterPath,
      title: row.title,
      tmdbId: row.tmdbId,
      year: row.releaseDate?.slice(0, 4) ?? null,
    })),
    next:
      rows.length > LIST_ITEMS_PAGE_SIZE ? offset + LIST_ITEMS_PAGE_SIZE : null,
  };
}

export async function getListFacets({
  listId,
  session,
}: {
  listId: string;
  session: Session;
}): Promise<TitleFacets> {
  const ranked = rankedItems(session, listId);
  const rows = await session.db
    .select({ genreIds: ranked.genreIds, releaseDate: ranked.releaseDate })
    .from(ranked);
  return toFacets(rows);
}

export async function getListComments({
  listId,
  session,
  viewerId,
}: {
  listId: string;
  session: Session;
  viewerId: string | null;
}): Promise<{ comments: ListComment[]; own: string | null }> {
  const rows = await session.db
    .select({
      accountId: reviews.accountId,
      avatarUrl: accounts.avatarUrl,
      content: reviews.content,
      createdAt: reviews.createdAt,
      displayName: accounts.displayName,
      id: reviews.id,
      likesCount: reviews.likesCount,
      username: accounts.username,
    })
    .from(reviews)
    .innerJoin(accounts, eq(accounts.id, reviews.accountId))
    .where(eq(reviews.listId, listId))
    .orderBy(desc(reviews.createdAt), asc(reviews.id))
    .limit(LIST_COMMENTS_SHOWN);

  const shown = rows.filter((row) => row.username);
  const liked =
    viewerId && shown.length > 0
      ? new Set(
          (
            await session.db
              .select({ id: reviewLikes.reviewId })
              .from(reviewLikes)
              .where(
                and(
                  eq(reviewLikes.accountId, viewerId),
                  inArray(
                    reviewLikes.reviewId,
                    shown.map((row) => row.id),
                  ),
                ),
              )
          ).map((row) => row.id),
        )
      : new Set<string>();

  let own: string | null = null;
  if (viewerId) {
    const mine = rows.find((row) => row.accountId === viewerId);
    if (mine) own = mine.content;
    else {
      const [row] = await session.db
        .select({ content: reviews.content })
        .from(reviews)
        .where(and(eq(reviews.listId, listId), eq(reviews.accountId, viewerId)))
        .limit(1);
      own = row?.content ?? null;
    }
  }

  return {
    comments: shown.map((row) => ({
      author: {
        avatarUrl: row.avatarUrl,
        displayName: row.displayName || row.username || "",
        id: row.accountId,
        username: row.username ?? "",
      },
      content: row.content.trim(),
      createdAt: row.createdAt,
      id: row.id,
      liked: liked.has(row.id),
      likesCount: row.likesCount,
    })),
    own,
  };
}
