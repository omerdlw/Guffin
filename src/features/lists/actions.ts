"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { mutate, requireUser } from "@/features/auth/server";
import type { MutationResult as ActionResult } from "@/features/auth/types";
import { fail, ok } from "@/features/auth/utils";
import { isUuid } from "@/lib/http";
import { checkRateLimit } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTmdbId } from "@/lib/tmdb/api";
import { getMovieDetails, movieSnapshot } from "@/lib/tmdb/server";
import type { MovieDetails } from "@/lib/tmdb/shared";
import {
  LIST_COLUMNS,
  LIST_ITEMS_MAX,
  LIST_TITLE_MAX,
  MAX_LISTS,
  PREVIEW_BATCH,
} from "./constants";
import type {
  ListInput,
  ListOrderItem,
  ListRecord,
  ListsClient,
  MovieListChangeResult,
  MovieListsResult,
} from "./types";
import { cleanList, messageFor, summarize } from "./utils";

async function limited(userId: string) {
  const limit = await checkRateLimit(`lists:${userId}`, 60);
  return limit.success;
}

async function loadMovie(tmdbId: number): Promise<MovieDetails | null> {
  const result = await getMovieDetails(tmdbId);
  return result.success ? result.data : null;
}

async function addItem(
  client: ListsClient,
  listId: string,
  tmdbId: number,
  movie: MovieDetails,
) {
  return client
    .from("list_items")
    .upsert(
      { list_id: listId, tmdb_id: tmdbId, ...movieSnapshot(movie) },
      { ignoreDuplicates: true, onConflict: "list_id,tmdb_id" },
    );
}

async function readList(
  client: ListsClient,
  listId: string,
  accountId: string,
) {
  const { data, error } = await client
    .from("lists")
    .select(LIST_COLUMNS)
    .eq("id", listId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  return data as ListRecord | null;
}

export async function getMovieListsAction(
  tmdbId: number,
): Promise<MovieListsResult> {
  try {
    if (!isTmdbId(tmdbId)) return fail("Invalid movie");

    const user = await requireUser();
    const client = await createServerSupabaseClient();

    const lists = await client
      .from("lists")
      .select(LIST_COLUMNS)
      .eq("account_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(MAX_LISTS);
    if (lists.error) throw lists.error;

    const rows = (lists.data ?? []) as ListRecord[];
    const [memberships, previews] = await Promise.all([
      getMemberships(client, rows, tmdbId),
      getManyListPreviews(client, rows),
    ]);

    return {
      lists: rows.map((row) => summarize(row, previews.get(row.id) ?? [])),
      memberships,
      success: true,
    };
  } catch (error) {
    report("MovieLists read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your lists" }),
    );
  }
}

async function getMemberships(
  client: ListsClient,
  rows: readonly ListRecord[],
  tmdbId: number,
): Promise<string[]> {
  if (rows.length === 0) return [];
  const { data, error } = await client
    .from("list_items")
    .select("list_id")
    .eq("tmdb_id", tmdbId)
    .in(
      "list_id",
      rows.map((row) => row.id),
    );
  if (error) throw error;
  return (data ?? []).map((item: { list_id: string }) => item.list_id);
}

async function getManyListPreviews(
  client: ListsClient,
  rows: readonly ListRecord[],
): Promise<Map<string, string[]>> {
  const ids = rows.filter((row) => row.items_count > 0).map((row) => row.id);
  const batches: string[][] = [];
  for (let at = 0; at < ids.length; at += PREVIEW_BATCH) {
    batches.push(ids.slice(at, at + PREVIEW_BATCH));
  }
  const results = await Promise.all(
    batches.map((batch) =>
      client.rpc("get_list_previews", { p_limit: 4, p_list_ids: batch }),
    ),
  );

  const previews = new Map<string, string[]>();
  for (const { data, error } of results) {
    if (error) throw error;
    for (const item of data ?? []) {
      if (!item.poster_path) continue;
      const posters = previews.get(item.list_id) ?? [];
      posters.push(item.poster_path);
      previews.set(item.list_id, posters);
    }
  }
  return previews;
}

async function getListPreviews(client: ListsClient, listId: string) {
  const { data } = await client
    .from("list_items")
    .select("poster_path")
    .eq("list_id", listId)
    .order("position", { ascending: true })
    .limit(4);
  return (data ?? []).map((item) => item.poster_path).filter(Boolean);
}

export async function setMovieListMembershipAction(
  tmdbId: number,
  listId: string,
  active: boolean,
): Promise<MovieListChangeResult> {
  try {
    if (!isTmdbId(tmdbId) || !isUuid(listId)) return fail("Invalid request");

    const user = await requireUser();
    if (!(await limited(user.id))) {
      return fail("Too many requests, slow down a little");
    }

    const client = await createServerSupabaseClient();
    if (!(await readList(client, listId, user.id))) {
      return fail("That list no longer exists");
    }

    if (active) {
      const movie = await loadMovie(tmdbId);
      if (!movie) return fail("Could not load this movie, try again");
      const { error } = await addItem(client, listId, tmdbId, movie);
      if (error) throw error;
    } else {
      const { error } = await client
        .from("list_items")
        .delete()
        .eq("list_id", listId)
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    }

    const list = await readList(client, listId, user.id);
    if (!list) return fail("That list no longer exists");
    const previews = await getListPreviews(client, listId);
    return { inList: active, list: summarize(list, previews), success: true };
  } catch (error) {
    report("MovieLists write", error);
    return fail(messageFor(error, "Could not update your list"));
  }
}

export async function createMovieListAction(
  tmdbId: number,
  title: string,
  isPrivate: boolean,
): Promise<MovieListChangeResult> {
  try {
    const cleaned = typeof title === "string" ? title.trim() : "";
    if (!isTmdbId(tmdbId) || !cleaned || cleaned.length > LIST_TITLE_MAX) {
      return fail("Give the list a name of up to 120 characters");
    }

    const user = await requireUser();
    if (!(await limited(user.id))) {
      return fail("Too many requests, slow down a little");
    }

    const movie = await loadMovie(tmdbId);
    if (!movie) return fail("Could not load this movie, try again");

    const client = await createServerSupabaseClient();
    const created = await client
      .from("lists")
      .insert({
        account_id: user.id,
        is_private: Boolean(isPrivate),
        title: cleaned,
      })
      .select(LIST_COLUMNS)
      .single();
    if (created.error) throw created.error;

    const listId = (created.data as ListRecord).id;
    const { error } = await addItem(client, listId, tmdbId, movie);
    if (error) throw error;

    const list = await readList(client, listId, user.id);
    const previews = await getListPreviews(client, listId);
    return {
      inList: true,
      list: summarize(list ?? (created.data as ListRecord), previews),
      success: true,
    };
  } catch (error) {
    report("MovieLists create", error);
    return fail(messageFor(error, "Could not create your list"));
  }
}

export async function setListLikeAction(
  listId: string,
  liked: boolean,
): Promise<ActionResult> {
  if (!isUuid(listId)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not update your like",
      name: "List like",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      const { data: list, error: listError } = await client
        .from("lists")
        .select("account_id")
        .eq("id", listId)
        .maybeSingle();
      if (listError) throw listError;
      if (!list) return fail("This list is no longer available");
      if (list.account_id === userId) {
        return fail("You can't like your own list");
      }

      const { error } = liked
        ? await client
            .from("list_likes")
            .upsert(
              { account_id: userId, list_id: listId },
              { ignoreDuplicates: true, onConflict: "list_id,account_id" },
            )
        : await client
            .from("list_likes")
            .delete()
            .eq("list_id", listId)
            .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}

export async function saveListAction(
  id: string | null,
  input: ListInput,
): Promise<ActionResult<{ slug: string }>> {
  const list = cleanList(input);
  if (!list || (id !== null && !isUuid(id))) {
    return fail("Give the list a name of up to 120 characters");
  }

  return mutate<{ slug: string }>(
    {
      fallback: "Could not save your list",
      name: "List save",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      const row = {
        description: list.description,
        is_private: list.isPrivate,
        is_ranked: list.isRanked,
        title: list.title,
      };

      const result = id
        ? await client
            .from("lists")
            .update(row)
            .eq("id", id)
            .eq("account_id", userId)
            .select("slug")
            .single()
        : await client
            .from("lists")
            .insert({ ...row, account_id: userId })
            .select("slug")
            .single();
      if (result.error) throw result.error;
      return ok({ slug: result.data.slug });
    },
  );
}

export async function deleteListAction(listId: string): Promise<ActionResult> {
  if (!isUuid(listId)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not delete this list",
      name: "List delete",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      const { error } = await client
        .from("lists")
        .delete()
        .eq("id", listId)
        .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}

export async function getListOrderAction(
  listId: string,
): Promise<ActionResult<{ items: ListOrderItem[] }>> {
  if (!isUuid(listId)) return fail("Invalid request");
  return mutate<{ items: ListOrderItem[] }>(
    {
      fallback: "Could not load this list",
      name: "List order read",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      const list = await client
        .from("lists")
        .select("id")
        .eq("id", listId)
        .eq("account_id", userId)
        .maybeSingle();
      if (list.error) throw list.error;
      if (!list.data) return fail("That list no longer exists");

      const { data, error } = await client
        .from("list_items")
        .select("tmdb_id, title, poster_path, release_date")
        .eq("list_id", listId)
        .order("position", { ascending: true })
        .limit(LIST_ITEMS_MAX);
      if (error) throw error;
      return ok({
        items: (data ?? []).map((row) => ({
          posterPath: row.poster_path,
          title: row.title,
          tmdbId: row.tmdb_id,
          year: row.release_date ? row.release_date.slice(0, 4) : null,
        })),
      });
    },
  );
}

export async function reorderListAction(
  listId: string,
  tmdbIds: readonly number[],
): Promise<ActionResult> {
  if (
    !isUuid(listId) ||
    !Array.isArray(tmdbIds) ||
    tmdbIds.length === 0 ||
    tmdbIds.length > LIST_ITEMS_MAX ||
    !tmdbIds.every(isTmdbId)
  ) {
    return fail("Invalid request");
  }
  return mutate(
    {
      fallback: "Could not save the new order",
      name: "List reorder",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client }) => {
      const { error } = await client.rpc("reorder_list_items", {
        p_list_id: listId,
        p_tmdb_ids: [...tmdbIds],
      });
      if (error) {
        if (error.code === "22023") {
          return fail("The list changed while you were arranging it");
        }
        throw error;
      }
      return ok();
    },
  );
}
