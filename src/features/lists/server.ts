import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ListsClient, PopularList } from "./list";

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
  client: ListsClient,
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
      client.rpc("get_list_previews", { p_limit: limit, p_list_ids: batch }),
    ),
  );

  const previews = new Map<string, (string | null)[]>();
  for (const { data, error } of results) {
    if (error) throw error;
    for (const item of data ?? []) {
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
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("lists")
      .select(
        "id, slug, title, description, items_count, likes_count, reviews_count, owner:accounts!lists_account_id_fkey!inner(username, display_name, avatar_url), list_items!inner(tmdb_id)",
      )
      .eq("list_items.tmdb_id", tmdbId)
      .eq("is_private", false)
      .order("likes_count", { ascending: false })
      .order("items_count", { ascending: false })
      .limit(POPULAR_LISTS_SHOWN);
    if (error) throw error;
    const rows = ((data ?? []) as unknown as PopularListRow[]).filter(
      (row) => row.owner?.username,
    );
    if (rows.length === 0) return [];

    const previews = await readListPreviews(
      client,
      rows.map((row) => row.id),
      POPULAR_PREVIEW_POSTERS,
    );

    return rows.map((row) => toPopularList(row, previews.get(row.id) ?? []));
  } catch (error) {
    report("Popular lists read", error);
    return [];
  }
}
