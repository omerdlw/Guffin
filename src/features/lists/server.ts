import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  POPULAR_LISTS_SHOWN,
  POPULAR_PREVIEW_POSTERS,
  PREVIEW_BATCH,
} from "./constants";
import type { ListsClient, PopularList, PopularListRow } from "./types";
import { toPopularList } from "./utils";

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
