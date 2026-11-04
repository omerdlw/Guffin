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
import { revalidatePath } from "next/cache";
import { getOptionalUser, mutate, requireUser } from "@/features/auth/server";
import type { MutationResult as ActionResult } from "@/features/auth/types";
import { fail, ok } from "@/features/auth/utils";
import { FAVORITES_MAX } from "@/features/profile/constants";
import { isUuid } from "@/lib/http";
import { accountHref } from "@/lib/project";
import { checkRateLimit } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTmdbId } from "@/lib/tmdb/api";
import { getMovieDetails, movieSnapshot } from "@/lib/tmdb/server";
import type { MovieDetails } from "@/lib/tmdb/shared";
import {
  COUNT_HEAD_OPTIONS,
  DIARY_INSERT_ERRORS,
  EMPTY_MOVIE_LIBRARY,
  LIBRARY_MARKS_MAX,
  LIBRARY_TABLES,
  LIBRARY_UPSERT_OPTIONS,
  MOVIE_LIBRARY_KINDS,
} from "./constants";
import { rememberWatchedPayload, updateAccount } from "./server";
import type {
  AccountClient,
  AccountPatchInput,
  CurrentAccount,
  DiaryLogResult,
  FollowStatus,
  LibraryMarksResult,
  MovieLibraryKind,
  MovieLibraryResult,
  MovieLibraryState,
} from "./types";
import { isDiaryDate, isMovieLibraryKind } from "./utils";

function revalidateAccount(username?: string | null): void {
  if (username) revalidatePath(accountHref(username));
  revalidatePath("/account");
}

async function runAccountAction<T>(
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

async function requireFollowTarget(followingId: string) {
  const user = await requireUser();
  if (!followingId || followingId === user.id) {
    throw new UserError("Invalid follow target");
  }
  return user;
}

export async function followUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<FollowStatus>> {
  return runAccountAction(
    {
      code: "FOLLOW_FAILED",
      fallback: "Couldn't follow this account. Please try again",
      name: "AccountAction follow",
    },
    async () => {
      const user = await requireFollowTarget(followingId);
      const client = await createServerSupabaseClient();
      const { data: targets, error: targetError } = await client.rpc(
        "get_account_follow_target",
        { p_user_id: followingId },
      );
      if (targetError) throw targetError;
      if (!targets?.[0]) throw new UserError("Account not found");

      const status: FollowStatus = targets[0].is_private
        ? "pending"
        : "accepted";
      const { error } = await client
        .from("account_follows")
        .upsert(
          { follower_id: user.id, following_id: followingId, status },
          { onConflict: "follower_id,following_id" },
        );
      if (error) throw error;

      revalidateAccount(targetUsername);
      return okResult(status);
    },
  );
}

export async function unfollowUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<null>> {
  return runAccountAction(
    {
      code: "UNFOLLOW_FAILED",
      fallback: "Couldn't unfollow this account. Please try again",
      name: "AccountAction unfollow",
    },
    async () => {
      const user = await requireFollowTarget(followingId);
      const client = await createServerSupabaseClient();
      const { error } = await client
        .from("account_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followingId);
      if (error) throw error;

      revalidateAccount(targetUsername);
      return okResult(null);
    },
  );
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
): Promise<MovieLibraryState> {
  const results = await Promise.all(
    MOVIE_LIBRARY_KINDS.map((kind) =>
      client
        .from(LIBRARY_TABLES[kind])
        .select("tmdb_id", COUNT_HEAD_OPTIONS)
        .eq("account_id", accountId)
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
): Promise<number[]> {
  const { data, error } = await client
    .from(table)
    .select("tmdb_id")
    .eq("account_id", accountId)
    .in("tmdb_id", tmdbIds);
  if (error) throw error;
  return data.map((row) => row.tmdb_id);
}

function writeLibraryEntry(
  client: AccountClient,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
  movie: MovieDetails | null,
) {
  const table = client.from(LIBRARY_TABLES[kind]);
  if (!movie) {
    return table.delete().eq("account_id", accountId).eq("tmdb_id", tmdbId);
  }
  return table.upsert(
    { account_id: accountId, tmdb_id: tmdbId, ...movieSnapshot(movie) },
    LIBRARY_UPSERT_OPTIONS,
  );
}

export async function getMovieLibraryAction(
  tmdbId: number,
): Promise<MovieLibraryResult> {
  try {
    if (!isTmdbId(tmdbId)) return fail("Invalid movie");

    const user = await getOptionalUser();
    if (!user) return ok({ state: EMPTY_MOVIE_LIBRARY });

    const client = await createServerSupabaseClient();
    return ok({ state: await readLibraryState(client, user.id, tmdbId) });
  } catch (error) {
    report("MovieLibrary read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your library" }),
    );
  }
}

export async function getLibraryMarksAction(
  tmdbIds: number[],
): Promise<LibraryMarksResult> {
  try {
    if (
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
      readMarkedIds(client, LIBRARY_TABLES.watched, user.id, tmdbIds),
      readMarkedIds(client, LIBRARY_TABLES.watchlist, user.id, tmdbIds),
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
): Promise<MovieLibraryResult> {
  try {
    if (!isTmdbId(tmdbId) || !isMovieLibraryKind(kind)) {
      return fail("Invalid request");
    }

    const user = await requireUser();
    const limit = await checkRateLimit(`library:${user.id}`, 120);
    if (!limit.success) return fail("Too many requests, slow down a little");

    let movie: MovieDetails | null = null;
    if (active) {
      const result = await getMovieDetails(tmdbId);
      if (!result.success) return fail("Could not load this movie, try again");
      movie = result.data;
    }

    const client = await createServerSupabaseClient();
    const { error } = await writeLibraryEntry(
      client,
      user.id,
      tmdbId,
      kind,
      movie,
    );
    if (error) throw error;

    return ok({ state: await readLibraryState(client, user.id, tmdbId) });
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
): Promise<ActionResult> {
  if (!isTmdbId(tmdbId)) return fail("Invalid movie");

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
          .eq("tmdb_id", tmdbId);
        if (error) throw error;
        return ok();
      }

      const taken = await client
        .from("account_favorites")
        .select("tmdb_id, position")
        .eq("account_id", userId);
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

      const { error } = await client
        .from("account_favorites")
        .insert({ account_id: userId, position, tmdb_id: tmdbId });
      if (error) {
        if (error.code === "23503") return fail("Like this movie to pin it");
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
