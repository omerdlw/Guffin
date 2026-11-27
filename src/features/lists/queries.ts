import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { and, desc, eq, exists, isNotNull } from "drizzle-orm";
import { getViewerSession } from "@/features/auth/server";
import type { Session } from "@/infrastructure/db/client";
import { accounts, listItems, lists } from "@/infrastructure/db/schema";
import type { PopularList } from "./model";

interface PopularListRow {
  description: string | null;
  id: string;
  items_count: number;
  likes_count: number;
  owner: {
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null;
  reviews_count: number;
  slug: string;
  title: string;
}

const PREVIEW_BATCH = 50;

const POPULAR_LISTS_SHOWN = 3;

const POPULAR_PREVIEW_POSTERS = 5;

function toPopularList(
  row: PopularListRow,
  previews: (string | null)[],
): PopularList {
  return {
    description: row.description ?? "",
    id: row.id,
    itemsCount: row.items_count,
    likesCount: row.likes_count,
    owner: {
      avatarUrl: row.owner?.avatar_url ?? null,
      displayName: row.owner?.display_name || row.owner?.username || "",
      username: row.owner?.username ?? "",
    },
    previews,
    reviewsCount: row.reviews_count,
    slug: row.slug,
    title: row.title,
  };
}

export async function readListPreviews(
  session: Session,
  listIds: readonly string[],
  limit: number,
  { dropEmpty = false }: { dropEmpty?: boolean } = {},
): Promise<Map<string, (string | null)[]>> {
  const batches: string[][] = [];
  for (let at = 0; at < listIds.length; at += PREVIEW_BATCH) {
    batches.push(listIds.slice(at, at + PREVIEW_BATCH));
  }
  const results = await Promise.all(
    batches.map((batch) =>
      session.call("get_list_previews", { p_limit: limit, p_list_ids: batch }),
    ),
  );

  const previews = new Map<string, (string | null)[]>();
  for (const data of results) {
    for (const item of data) {
      if (dropEmpty && !item.poster_path) continue;
      const posters = previews.get(item.list_id) ?? [];
      posters.push(item.poster_path);
      previews.set(item.list_id, posters);
    }
  }
  return previews;
}

export async function getMoviePopularLists(
  tmdbId: number,
): Promise<PopularList[]> {
  try {
    const session = await getViewerSession();
    const rows: PopularListRow[] = await session.db
      .select({
        description: lists.description,
        id: lists.id,
        items_count: lists.itemsCount,
        likes_count: lists.likesCount,
        owner: {
          avatar_url: accounts.avatarUrl,
          display_name: accounts.displayName,
          username: accounts.username,
        },
        reviews_count: lists.reviewsCount,
        slug: lists.slug,
        title: lists.title,
      })
      .from(lists)
      .innerJoin(accounts, eq(accounts.id, lists.accountId))
      .where(
        and(
          eq(lists.isPrivate, false),
          isNotNull(accounts.username),
          exists(
            session.db
              .select({ one: listItems.listId })
              .from(listItems)
              .where(
                and(
                  eq(listItems.listId, lists.id),
                  eq(listItems.tmdbId, tmdbId),
                ),
              ),
          ),
        ),
      )
      .orderBy(desc(lists.likesCount), desc(lists.itemsCount))
      .limit(POPULAR_LISTS_SHOWN);
    if (rows.length === 0) return [];

    const previews = await readListPreviews(
      session,
      rows.map((row) => row.id),
      POPULAR_PREVIEW_POSTERS,
    );

    return rows.map((row) => toPopularList(row, previews.get(row.id) ?? []));
  } catch (error) {
    report("Popular lists read", error);
    return [];
  }
}
