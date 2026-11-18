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
import { isMediaType } from "@/features/catalog/quality";
import { isUuid } from "@/lib/http";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { pgError, pgErrorCode, type Session, viewer } from "@/lib/db/client";
import { pick } from "@/lib/db/pick";
import { listItems, listLikes, lists } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/security";
import { getMediaDetails, mediaSnapshot } from "@/lib/tmdb/server";
import type { MediaType, MovieDetails, ShowDetails } from "@/lib/tmdb/shared";
import { isTmdbId } from "@/lib/tmdb/transport";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
  type ListDraft,
  type ListOrderItem,
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

const LIST_COLUMNS = pick(lists, [
  "id",
  "title",
  "description",
  "is_private",
  "items_count",
  "poster_path",
]);

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
  if (pgErrorCode(error) === "54000") {
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
  session: Session,
  listId: string,
  mediaType: MediaType,
  tmdbId: number,
  media: MovieDetails | ShowDetails,
): Promise<void> {
  const { payload, ...snapshot } = mediaSnapshot(media);
  await session.db
    .insert(listItems)
    .values({ listId, mediaType, payload, tmdbId, ...snapshot })
    .onConflictDoNothing({
      target: [listItems.listId, listItems.mediaType, listItems.tmdbId],
    });
}

const loadFailure = (mediaType: MediaType) =>
  fail(
    mediaType === "tv"
      ? "Could not load this show, try again"
      : "Could not load this movie, try again",
  );

async function readList(
  session: Session,
  listId: string,
  accountId: string,
): Promise<ListRecord | null> {
  const [row] = await session.db
    .select(LIST_COLUMNS)
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.accountId, accountId)))
    .limit(1);
  return row ?? null;
}

async function getMemberships(
  session: Session,
  rows: readonly ListRecord[],
  tmdbId: number,
  mediaType: MediaType,
): Promise<string[]> {
  if (rows.length === 0) return [];
  const data = await session.db
    .select({ listId: listItems.listId })
    .from(listItems)
    .where(
      and(
        eq(listItems.mediaType, mediaType),
        eq(listItems.tmdbId, tmdbId),
        inArray(
          listItems.listId,
          rows.map((row) => row.id),
        ),
      ),
    );
  return data.map((item) => item.listId);
}

async function getManyListPreviews(
  session: Session,
  rows: readonly ListRecord[],
): Promise<Map<string, (string | null)[]>> {
  const ids = rows.filter((row) => row.items_count > 0).map((row) => row.id);
  return readListPreviews(session, ids, PREVIEW_POSTERS, { dropEmpty: true });
}

async function getListPreviews(session: Session, listId: string) {
  const data = await session.db
    .select({ posterPath: listItems.posterPath })
    .from(listItems)
    .where(eq(listItems.listId, listId))
    .orderBy(asc(listItems.position))
    .limit(PREVIEW_POSTERS);
  return data.map((item) => item.posterPath).filter(Boolean);
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
    const session = viewer(user.id);

    const rows = await session.db
      .select(LIST_COLUMNS)
      .from(lists)
      .where(and(eq(lists.accountId, user.id), eq(lists.mediaType, mediaType)))
      .orderBy(desc(lists.updatedAt))
      .limit(MAX_LISTS);

    const [memberships, previews] = await Promise.all([
      getMemberships(session, rows, tmdbId, mediaType),
      getManyListPreviews(session, rows),
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

    const session = viewer(user.id);
    if (!(await readList(session, listId, user.id))) {
      return fail("That list no longer exists");
    }

    if (active) {
      const media = await loadMedia(mediaType, tmdbId);
      if (!media) return loadFailure(mediaType);
      try {
        await addItem(session, listId, mediaType, tmdbId, media);
      } catch (error) {
        if (pgError(error)?.message.includes("LIST_MEDIA_TYPE_MISMATCH")) {
          return fail("That list holds a different kind of title");
        }
        throw error;
      }
    } else {
      await session.db
        .delete(listItems)
        .where(
          and(
            eq(listItems.listId, listId),
            eq(listItems.mediaType, mediaType),
            eq(listItems.tmdbId, tmdbId),
          ),
        );
    }

    const list = await readList(session, listId, user.id);
    if (!list) return fail("That list no longer exists");
    const previews = await getListPreviews(session, listId);
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

    const session = viewer(user.id);
    const [created] = await session.db
      .insert(lists)
      .values({
        accountId: user.id,
        isPrivate: Boolean(isPrivate),
        mediaType,
        title: cleaned,
      })
      .returning(LIST_COLUMNS);
    if (!created) throw new Error("List insert returned no row");

    await addItem(session, created.id, mediaType, tmdbId, media);

    const list = await readList(session, created.id, user.id);
    const previews = await getListPreviews(session, created.id);
    return ok({
      inList: true,
      list: toListSummary(list ?? created, previews),
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
    async ({ session, userId }) => {
      const [list] = await session.db
        .select({ accountId: lists.accountId })
        .from(lists)
        .where(eq(lists.id, listId))
        .limit(1);
      if (!list) return fail("This list is no longer available");
      if (list.accountId === userId) {
        return fail("You can't like your own list");
      }

      if (liked) {
        await session.db
          .insert(listLikes)
          .values({ accountId: userId, listId })
          .onConflictDoNothing();
      } else {
        await session.db
          .delete(listLikes)
          .where(
            and(eq(listLikes.listId, listId), eq(listLikes.accountId, userId)),
          );
      }
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
    async ({ session, userId }) => {
      const row = {
        description: list.description,
        isPrivate: list.isPrivate,
        isRanked: list.isRanked,
        title: list.title,
      };

      const [saved] = id
        ? await session.db
            .update(lists)
            .set(row)
            .where(and(eq(lists.id, id), eq(lists.accountId, userId)))
            .returning({ slug: lists.slug })
        : await session.db
            .insert(lists)
            .values({ ...row, accountId: userId, mediaType })
            .returning({ slug: lists.slug });
      if (!saved) return fail("That list no longer exists");
      return ok({ slug: saved.slug });
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
    async ({ session, userId }) => {
      await session.db
        .delete(lists)
        .where(and(eq(lists.id, listId), eq(lists.accountId, userId)));
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
    async ({ session, userId }) => {
      const [list] = await session.db
        .select({ id: lists.id })
        .from(lists)
        .where(and(eq(lists.id, listId), eq(lists.accountId, userId)))
        .limit(1);
      if (!list) return fail("That list no longer exists");

      const data = await session.db
        .select({
          posterPath: listItems.posterPath,
          releaseDate: listItems.releaseDate,
          title: listItems.title,
          tmdbId: listItems.tmdbId,
        })
        .from(listItems)
        .where(eq(listItems.listId, listId))
        .orderBy(asc(listItems.position))
        .limit(LIST_ITEMS_MAX);
      return ok({
        items: data.map((row) => ({
          posterPath: row.posterPath,
          title: row.title,
          tmdbId: row.tmdbId,
          year: row.releaseDate ? row.releaseDate.slice(0, 4) : null,
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
    async ({ session }) => {
      try {
        await session.call("reorder_list_items", {
          p_list_id: listId,
          p_tmdb_ids: [...tmdbIds],
        });
      } catch (error) {
        if (pgErrorCode(error) === "22023") {
          return fail("The list changed while you were arranging it");
        }
        throw error;
      }
      return ok();
    },
  );
}
