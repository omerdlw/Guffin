"use server";
import "server-only";

import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import {
  fail,
  type MutationResult as ActionResult,
  type MutationResult,
  ok,
} from "@/features/auth/mutation";
import { mutate, requireUser } from "@/features/auth/server";
import type { MediaType } from "@/features/catalog/types";
import { isMediaType } from "@/features/catalog/utils";
import { isUuid } from "@/lib/http";
import { checkRateLimit } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMediaDetails, mediaSnapshot } from "@/lib/tmdb/server";
import type { MovieDetails, ShowDetails } from "@/lib/tmdb/shared";
import { isTmdbId } from "@/lib/tmdb/transport";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
  type ListDraft,
  type ListOrderItem,
  type ListsClient,
  type MovieListSummary,
} from "./list";
import { readListPreviews } from "./server";

type MovieListsResult = MutationResult<{
  lists: MovieListSummary[];
  memberships: string[];
}>;

type MovieListChangeResult = MutationResult<{
  inList: boolean;
  list: MovieListSummary;
}>;

type ListInput = ListDraft;

interface ListRecord {
  description: string | null;
  id: string;
  is_private: boolean;
  items_count: number;
  poster_path: string | null;
  title: string;
}

const LIST_COLUMNS =
  "id, title, description, is_private, items_count, poster_path";

const MAX_LISTS = 200;

const PREVIEW_POSTERS = 4;

const LIST_RATE_LIMIT_PER_MINUTE = 60;

const LIST_ITEMS_MAX = 2000;

const toListSummary = (
  row: ListRecord,
  previewPosters?: (string | null)[],
): MovieListSummary => ({
  description: row.description,
  id: row.id,
  isPrivate: row.is_private,
  itemsCount: row.items_count,
  posterPath: row.poster_path,
  previewPosters: previewPosters ?? (row.poster_path ? [row.poster_path] : []),
  title: row.title,
});

function listErrorMessage(error: unknown, fallback: string) {
  if ((error as { code?: string } | null)?.code === "54000") {
    return "That list is full";
  }
  return toUserMessage(error, { fallback });
}

function sanitizeListInput(input: ListInput): ListInput | null {
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const description =
    typeof input?.description === "string" ? input.description.trim() : "";
  if (!title || title.length > LIST_TITLE_MAX) return null;
  if (description.length > LIST_DESCRIPTION_MAX) return null;
  return {
    description,
    isPrivate: Boolean(input.isPrivate),
    isRanked: Boolean(input.isRanked),
    title,
  };
}

async function isWithinRateLimit(userId: string) {
  const limit = await checkRateLimit(
    `lists:${userId}`,
    LIST_RATE_LIMIT_PER_MINUTE,
  );
  return limit.success;
}

async function loadMedia(
  mediaType: MediaType,
  tmdbId: number,
): Promise<MovieDetails | ShowDetails | null> {
  const result = await getMediaDetails(mediaType, tmdbId);
  return result.success ? result.data.details : null;
}

async function addItem(
  client: ListsClient,
  listId: string,
  mediaType: MediaType,
  tmdbId: number,
  media: MovieDetails | ShowDetails,
) {
  return client.from("list_items").upsert(
    {
      list_id: listId,
      media_type: mediaType,
      tmdb_id: tmdbId,
      ...mediaSnapshot(media),
    },
    { ignoreDuplicates: true, onConflict: "list_id,media_type,tmdb_id" },
  );
}

const loadFailure = (mediaType: MediaType) =>
  fail(
    mediaType === "tv"
      ? "Could not load this show, try again"
      : "Could not load this movie, try again",
  );

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

async function getMemberships(
  client: ListsClient,
  rows: readonly ListRecord[],
  tmdbId: number,
  mediaType: MediaType,
): Promise<string[]> {
  if (rows.length === 0) return [];
  const { data, error } = await client
    .from("list_items")
    .select("list_id")
    .eq("media_type", mediaType)
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
): Promise<Map<string, (string | null)[]>> {
  const ids = rows.filter((row) => row.items_count > 0).map((row) => row.id);
  return readListPreviews(client, ids, PREVIEW_POSTERS, { dropEmpty: true });
}

async function getListPreviews(client: ListsClient, listId: string) {
  const { data } = await client
    .from("list_items")
    .select("poster_path")
    .eq("list_id", listId)
    .order("position", { ascending: true })
    .limit(PREVIEW_POSTERS);
  return (data ?? []).map((item) => item.poster_path).filter(Boolean);
}

export async function getMovieListsAction(
  tmdbId: number,
  mediaType: MediaType = "movie",
): Promise<MovieListsResult> {
  try {
    if (!isTmdbId(tmdbId) || !isMediaType(mediaType)) {
      return fail("Invalid title");
    }

    const user = await requireUser();
    const client = await createServerSupabaseClient();

    const lists = await client
      .from("lists")
      .select(LIST_COLUMNS)
      .eq("account_id", user.id)
      .eq("media_type", mediaType)
      .order("updated_at", { ascending: false })
      .limit(MAX_LISTS);
    if (lists.error) throw lists.error;

    const rows = (lists.data ?? []) as ListRecord[];
    const [memberships, previews] = await Promise.all([
      getMemberships(client, rows, tmdbId, mediaType),
      getManyListPreviews(client, rows),
    ]);

    return ok({
      lists: rows.map((row) => toListSummary(row, previews.get(row.id) ?? [])),
      memberships,
    });
  } catch (error) {
    report("MovieLists read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your lists" }),
    );
  }
}

export async function setMovieListMembershipAction(
  tmdbId: number,
  listId: string,
  active: boolean,
  mediaType: MediaType = "movie",
): Promise<MovieListChangeResult> {
  try {
    if (!isTmdbId(tmdbId) || !isUuid(listId) || !isMediaType(mediaType)) {
      return fail("Invalid request");
    }

    const user = await requireUser();
    if (!(await isWithinRateLimit(user.id))) {
      return fail("Too many requests, slow down a little");
    }

    const client = await createServerSupabaseClient();
    if (!(await readList(client, listId, user.id))) {
      return fail("That list no longer exists");
    }

    if (active) {
      const media = await loadMedia(mediaType, tmdbId);
      if (!media) return loadFailure(mediaType);
      const { error } = await addItem(client, listId, mediaType, tmdbId, media);
      if (error) {
        if (error.message.includes("LIST_MEDIA_TYPE_MISMATCH")) {
          return fail("That list holds a different kind of title");
        }
        throw error;
      }
    } else {
      const { error } = await client
        .from("list_items")
        .delete()
        .eq("list_id", listId)
        .eq("media_type", mediaType)
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    }

    const list = await readList(client, listId, user.id);
    if (!list) return fail("That list no longer exists");
    const previews = await getListPreviews(client, listId);
    return ok({ inList: active, list: toListSummary(list, previews) });
  } catch (error) {
    report("MovieLists write", error);
    return fail(listErrorMessage(error, "Could not update your list"));
  }
}

export async function createMovieListAction(
  tmdbId: number,
  title: string,
  isPrivate: boolean,
  mediaType: MediaType = "movie",
): Promise<MovieListChangeResult> {
  try {
    const cleaned = typeof title === "string" ? title.trim() : "";
    if (!isMediaType(mediaType)) return fail("Invalid request");
    if (!isTmdbId(tmdbId) || !cleaned || cleaned.length > LIST_TITLE_MAX) {
      return fail("Give the list a name of up to 120 characters");
    }

    const user = await requireUser();
    if (!(await isWithinRateLimit(user.id))) {
      return fail("Too many requests, slow down a little");
    }

    const media = await loadMedia(mediaType, tmdbId);
    if (!media) return loadFailure(mediaType);

    const client = await createServerSupabaseClient();
    const created = await client
      .from("lists")
      .insert({
        account_id: user.id,
        is_private: Boolean(isPrivate),
        media_type: mediaType,
        title: cleaned,
      })
      .select(LIST_COLUMNS)
      .single();
    if (created.error) throw created.error;

    const listId = (created.data as ListRecord).id;
    const { error } = await addItem(client, listId, mediaType, tmdbId, media);
    if (error) throw error;

    const list = await readList(client, listId, user.id);
    const previews = await getListPreviews(client, listId);
    return ok({
      inList: true,
      list: toListSummary(list ?? (created.data as ListRecord), previews),
    });
  } catch (error) {
    report("MovieLists create", error);
    return fail(listErrorMessage(error, "Could not create your list"));
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
  mediaType: MediaType = "movie",
): Promise<ActionResult<{ slug: string }>> {
  const list = sanitizeListInput(input);
  if (!isMediaType(mediaType)) return fail("Invalid request");
  if (!list || (id !== null && !isUuid(id))) {
    return fail("Give the list a name of up to 120 characters");
  }

  return mutate<{ slug: string }>(
    {
      fallback: "Could not save your list",
      name: "List save",
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
            .insert({ ...row, account_id: userId, media_type: mediaType })
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
