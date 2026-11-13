"use server";
import "server-only";

import {
  err,
  ok as okResult,
  type Result,
} from "@omerdlw/base-framework/result";
import {
  report,
  toUserMessage,
  UserError,
} from "@omerdlw/base-framework/utils";
import {
  fail,
  type MutationResult as ActionResult,
  type MutationResult,
  ok,
} from "@/features/auth/mutation";
import { getOptionalUser, mutate, requireUser } from "@/features/auth/server";
import { isMediaType } from "@/features/catalog/quality";
import { ensureCatalogEntry } from "@/features/catalog/server";
import { FAVORITES_MAX } from "@/features/profile/profile";
import { setShowCompleted } from "@/features/tv/server";
import { isUuid } from "@/lib/http";
import { checkRateLimit } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getMediaDetails,
  getMovieDetails,
  mediaSnapshot,
  movieSnapshot,
} from "@/lib/tmdb/server";
import type { MediaType, MovieDetails, ShowDetails } from "@/lib/tmdb/shared";
import { isTmdbId } from "@/lib/tmdb/transport";
import {
  type AccountPatchInput,
  type CurrentAccount,
  EMPTY_MOVIE_LIBRARY,
  MOVIE_LIBRARY_KINDS,
  type MovieLibraryKind,
  type MovieLibraryState,
} from "./account";
import {
  rememberWatchedPayload,
  revalidateAccount,
  updateAccount,
} from "./server";

type MovieLibraryResult = MutationResult<{ state: MovieLibraryState }>;

type DiaryLogResult = MutationResult;

type AccountClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type LibraryMarksResult = MutationResult<{
  watched: number[];
  watchlist: number[];
}>;

const LIBRARY_TABLES = {
  liked: "account_likes",
  watched: "account_watched",
  watchlist: "account_watchlist",
} as const;

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const LIBRARY_UPSERT_OPTIONS = {
  onConflict: "account_id,media_type,tmdb_id",
  ignoreDuplicates: true,
};

const COUNT_HEAD_OPTIONS = { count: "exact", head: true } as const;

const LIBRARY_MARKS_MAX = 100;

const DIARY_INSERT_ERRORS: Record<string, string> = {
  DIARY_DATE_BEFORE_LATEST_ENTRY: "This movie is already logged on a later day",
  DIARY_DATE_IN_FUTURE: "You cannot log a movie in the future",
};

function isMovieLibraryKind(value: unknown): value is MovieLibraryKind {
  return (MOVIE_LIBRARY_KINDS as readonly unknown[]).includes(value);
}

function isDiaryDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DAY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function runAccountAction<T>(
  { code, fallback, name }: { code: string; fallback: string; name: string },
  work: () => Promise<Result<T>>,
): Promise<Result<T>> {
  try {
    return await work();
  } catch (error: unknown) {
    report(name, error);
    return err(toUserMessage(error, { fallback }), code);
  }
}

export async function requireFollowTarget(followingId: string) {
  const user = await requireUser();
  if (!followingId || followingId === user.id) {
    throw new UserError("Invalid follow target");
  }
  return user;
}

export async function updateAccountAction(
  input: AccountPatchInput,
): Promise<Result<CurrentAccount>> {
  const fallback = "Your account couldn't be updated. Please try again";
  return runAccountAction(
    { code: "ACCOUNT_UPDATE_FAILED", fallback, name: "AccountAction update" },
    async () => {
      const user = await requireUser();
      const client = await createServerSupabaseClient();
      const { account } = await updateAccount({
        client,
        input,
        userId: user.id,
      });
      if (!account) return err(fallback);

      revalidateAccount(account.username);
      return okResult(account);
    },
  );
}

async function readLibraryState(
  client: AccountClient,
  accountId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<MovieLibraryState> {
  const results = await Promise.all(
    MOVIE_LIBRARY_KINDS.map((kind) =>
      client
        .from(LIBRARY_TABLES[kind])
        .select("tmdb_id", COUNT_HEAD_OPTIONS)
        .eq("account_id", accountId)
        .eq("media_type", mediaType)
        .eq("tmdb_id", tmdbId),
    ),
  );

  const state = { ...EMPTY_MOVIE_LIBRARY };
  MOVIE_LIBRARY_KINDS.forEach((kind, index) => {
    const { count, error } = results[index];
    if (error) throw error;
    state[kind] = (count ?? 0) > 0;
  });
  return state;
}

async function readMarkedIds(
  client: AccountClient,
  table: typeof LIBRARY_TABLES.watched | typeof LIBRARY_TABLES.watchlist,
  accountId: string,
  tmdbIds: number[],
  mediaType: MediaType,
): Promise<number[]> {
  const { data, error } = await client
    .from(table)
    .select("tmdb_id")
    .eq("account_id", accountId)
    .eq("media_type", mediaType)
    .in("tmdb_id", tmdbIds);
  if (error) throw error;
  return data.map((row) => row.tmdb_id);
}

function writeLibraryEntry(
  client: AccountClient,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
  mediaType: MediaType,
  media: MovieDetails | ShowDetails | null,
) {
  const table = client.from(LIBRARY_TABLES[kind]);
  if (!media) {
    return table
      .delete()
      .eq("account_id", accountId)
      .eq("media_type", mediaType)
      .eq("tmdb_id", tmdbId);
  }
  return table.upsert(
    {
      account_id: accountId,
      media_type: mediaType,
      tmdb_id: tmdbId,
      ...mediaSnapshot(media),
    },
    LIBRARY_UPSERT_OPTIONS,
  );
}

export async function getMovieLibraryAction(
  tmdbId: number,
  mediaType: MediaType = "movie",
): Promise<MovieLibraryResult> {
  try {
    if (!isTmdbId(tmdbId) || !isMediaType(mediaType)) {
      return fail("Invalid title");
    }

    const user = await getOptionalUser();
    if (!user) return ok({ state: EMPTY_MOVIE_LIBRARY });

    const client = await createServerSupabaseClient();
    return ok({
      state: await readLibraryState(client, user.id, tmdbId, mediaType),
    });
  } catch (error) {
    report("MovieLibrary read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your library" }),
    );
  }
}

export async function getLibraryMarksAction(
  tmdbIds: number[],
  mediaType: MediaType = "movie",
): Promise<LibraryMarksResult> {
  try {
    if (
      !isMediaType(mediaType) ||
      !Array.isArray(tmdbIds) ||
      tmdbIds.length > LIBRARY_MARKS_MAX ||
      !tmdbIds.every(isTmdbId)
    ) {
      return fail("Invalid request");
    }

    const user = await getOptionalUser();
    if (!user || tmdbIds.length === 0)
      return ok({ watched: [], watchlist: [] });

    const client = await createServerSupabaseClient();
    const [watched, watchlist] = await Promise.all([
      readMarkedIds(
        client,
        LIBRARY_TABLES.watched,
        user.id,
        tmdbIds,
        mediaType,
      ),
      readMarkedIds(
        client,
        LIBRARY_TABLES.watchlist,
        user.id,
        tmdbIds,
        mediaType,
      ),
    ]);
    return ok({ watched, watchlist });
  } catch (error) {
    report("MovieLibrary marks", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your library" }),
    );
  }
}

export async function setMovieLibraryAction(
  tmdbId: number,
  kind: MovieLibraryKind,
  active: boolean,
  mediaType: MediaType = "movie",
): Promise<MovieLibraryResult> {
  try {
    if (
      !isTmdbId(tmdbId) ||
      !isMovieLibraryKind(kind) ||
      !isMediaType(mediaType)
    ) {
      return fail("Invalid request");
    }

    const user = await requireUser();
    const limit = await checkRateLimit(`library:${user.id}`, 120);
    if (!limit.success) return fail("Too many requests, slow down a little");

    const client = await createServerSupabaseClient();

    if (mediaType === "tv" && kind === "watched") {
      if (!(await ensureCatalogEntry("tv", tmdbId))) {
        return fail("Could not load this show, try again");
      }
      await setShowCompleted(client, tmdbId, active);
      return ok({
        state: await readLibraryState(client, user.id, tmdbId, mediaType),
      });
    }

    let media: MovieDetails | ShowDetails | null = null;
    if (active) {
      const result = await getMediaDetails(mediaType, tmdbId);
      if (!result.success) return fail("Could not load this title, try again");
      media = result.data.details;
      if (mediaType === "tv") await ensureCatalogEntry("tv", tmdbId);
    }

    const { error } = await writeLibraryEntry(
      client,
      user.id,
      tmdbId,
      kind,
      mediaType,
      media,
    );
    if (error) throw error;

    return ok({
      state: await readLibraryState(client, user.id, tmdbId, mediaType),
    });
  } catch (error) {
    report("MovieLibrary write", error);
    return fail(
      toUserMessage(error, { fallback: "Could not update your library" }),
    );
  }
}

export async function logMovieToDiaryAction(
  tmdbId: number,
  watchedOn: string,
): Promise<DiaryLogResult> {
  try {
    if (!isTmdbId(tmdbId) || !isDiaryDate(watchedOn)) {
      return fail("Invalid request");
    }

    const user = await requireUser();
    const limit = await checkRateLimit(`diary:${user.id}`, 60);
    if (!limit.success) return fail("Too many requests, slow down a little");

    const result = await getMovieDetails(tmdbId);
    if (!result.success) return fail("Could not load this movie, try again");

    const { backdrop_path, payload, poster_path, release_date, title } =
      movieSnapshot(result.data);

    const client = await createServerSupabaseClient();
    const { error } = await client.from("account_diary").insert({
      account_id: user.id,
      backdrop_path,
      poster_path,
      release_date,
      title,
      tmdb_id: tmdbId,
      watched_on: watchedOn,
    });

    if (error) {
      const known = Object.keys(DIARY_INSERT_ERRORS).find((code) =>
        error.message.includes(code),
      );
      if (known) return fail(DIARY_INSERT_ERRORS[known]);
      throw error;
    }

    await rememberWatchedPayload(client, user.id, tmdbId, payload);
    return ok();
  } catch (error) {
    report("MovieDiary write", error);
    return fail(toUserMessage(error, { fallback: "Could not log this movie" }));
  }
}

export async function setFavoriteAction(
  tmdbId: number,
  pinned: boolean,
  mediaType: MediaType = "movie",
): Promise<ActionResult> {
  if (!isTmdbId(tmdbId) || !isMediaType(mediaType)) {
    return fail("Invalid title");
  }

  return mutate(
    {
      fallback: "Could not update your favorites",
      name: "Favorite write",
    },
    async ({ client, userId }) => {
      if (!pinned) {
        const { error } = await client
          .from("account_favorites")
          .delete()
          .eq("account_id", userId)
          .eq("media_type", mediaType)
          .eq("tmdb_id", tmdbId);
        if (error) throw error;
        return ok();
      }

      const taken = await client
        .from("account_favorites")
        .select("tmdb_id, position")
        .eq("account_id", userId)
        .eq("media_type", mediaType);
      if (taken.error) throw taken.error;

      const rows = taken.data ?? [];
      if (rows.some((row) => row.tmdb_id === tmdbId)) return ok();
      if (rows.length >= FAVORITES_MAX) {
        return fail(`You can pin up to ${FAVORITES_MAX} favorites`);
      }

      const used = new Set(rows.map((row) => row.position));
      const position = Array.from(
        { length: FAVORITES_MAX },
        (_, index) => index + 1,
      ).find((slot) => !used.has(slot));
      if (!position) return fail("Your favorites are full");

      const { error } = await client.from("account_favorites").insert({
        account_id: userId,
        media_type: mediaType,
        position,
        tmdb_id: tmdbId,
      });
      if (error) {
        if (error.code === "23503") {
          return fail(
            mediaType === "tv"
              ? "Like this show to pin it"
              : "Like this movie to pin it",
          );
        }
        throw error;
      }
      return ok();
    },
  );
}

export async function deleteDiaryEntryAction(
  id: string,
): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not remove this entry",
      name: "Diary delete",
    },
    async ({ client, userId }) => {
      const { error } = await client
        .from("account_diary")
        .delete()
        .eq("id", id)
        .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}
