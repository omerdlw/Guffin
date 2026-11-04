"use server";

import "server-only";
import {
  err,
  ok as okResult,
  type Result,
} from "@omerdlw/base-framework/result";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
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
  EMPTY_MOVIE_LIBRARY,
  LIBRARY_MARKS_MAX,
  LIBRARY_UPSERT_OPTIONS,
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
import {
  isDiaryDate,
  isMovieLibraryKind,
  libraryFail,
  librarySuccess,
  remove,
} from "./utils";

function revalidateAccount(username?: string | null): void {
  if (username) revalidatePath(accountHref(username));
  revalidatePath("/account");
}

export async function followUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<FollowStatus>> {
  try {
    const user = await requireUser();
    if (!followingId || followingId === user.id) {
      return err("Invalid follow target");
    }

    const client = await createServerSupabaseClient();
    const { data: targets, error: targetError } = await client.rpc(
      "get_account_follow_target",
      { p_user_id: followingId },
    );
    if (targetError) throw targetError;
    if (!targets?.[0]) return err("Account not found");

    const status: FollowStatus = targets[0].is_private ? "pending" : "accepted";
    const { error } = await client
      .from("account_follows")
      .upsert(
        { follower_id: user.id, following_id: followingId, status },
        { onConflict: "follower_id,following_id" },
      );
    if (error) throw error;

    revalidateAccount(targetUsername);
    return okResult(status);
  } catch (error: unknown) {
    report("AccountAction follow", error);
    return err(
      toUserMessage(error, {
        fallback: "Couldn't follow this account. Please try again",
      }),
      "FOLLOW_FAILED",
    );
  }
}

export async function unfollowUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<null>> {
  try {
    const user = await requireUser();
    if (!followingId || followingId === user.id) {
      return err("Invalid follow target");
    }

    const client = await createServerSupabaseClient();
    const { error } = await client
      .from("account_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);
    if (error) throw error;

    revalidateAccount(targetUsername);
    return okResult(null);
  } catch (error: unknown) {
    report("AccountAction unfollow", error);
    return err(
      toUserMessage(error, {
        fallback: "Couldn't unfollow this account. Please try again",
      }),
      "UNFOLLOW_FAILED",
    );
  }
}

export async function updateAccountAction(
  input: AccountPatchInput,
): Promise<Result<CurrentAccount>> {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const { account } = await updateAccount({ client, input, userId: user.id });
    if (!account) {
      return err("Your account couldn't be updated. Please try again");
    }

    revalidateAccount(account.username);
    return okResult(account);
  } catch (error: unknown) {
    report("AccountAction update account", error);
    return err(
      toUserMessage(error, {
        fallback: "Your account couldn't be updated. Please try again",
      }),
      "ACCOUNT_UPDATE_FAILED",
    );
  }
}

async function readState(
  client: AccountClient,
  accountId: string,
  tmdbId: number,
): Promise<MovieLibraryState> {
  const [liked, watched, watchlist] = await Promise.all([
    client
      .from("account_likes")
      .select("tmdb_id", COUNT_HEAD_OPTIONS)
      .eq("account_id", accountId)
      .eq("tmdb_id", tmdbId),
    client
      .from("account_watched")
      .select("tmdb_id", COUNT_HEAD_OPTIONS)
      .eq("account_id", accountId)
      .eq("tmdb_id", tmdbId),
    client
      .from("account_watchlist")
      .select("tmdb_id", COUNT_HEAD_OPTIONS)
      .eq("account_id", accountId)
      .eq("tmdb_id", tmdbId),
  ]);

  for (const result of [liked, watched, watchlist]) {
    if (result.error) throw result.error;
  }

  return {
    liked: (liked.count ?? 0) > 0,
    watched: (watched.count ?? 0) > 0,
    watchlist: (watchlist.count ?? 0) > 0,
  };
}

function add(
  client: AccountClient,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
  movie: MovieDetails,
) {
  const row = {
    account_id: accountId,
    tmdb_id: tmdbId,
    ...movieSnapshot(movie),
  };

  switch (kind) {
    case "liked":
      return client.from("account_likes").upsert(row, LIBRARY_UPSERT_OPTIONS);
    case "watched":
      return client.from("account_watched").upsert(row, LIBRARY_UPSERT_OPTIONS);
    case "watchlist":
      return client
        .from("account_watchlist")
        .upsert(row, LIBRARY_UPSERT_OPTIONS);
  }
}

export async function getMovieLibraryAction(
  tmdbId: number,
): Promise<MovieLibraryResult> {
  try {
    if (!isTmdbId(tmdbId)) return libraryFail("Invalid movie");

    const user = await getOptionalUser();
    if (!user) return librarySuccess(EMPTY_MOVIE_LIBRARY);

    const client = await createServerSupabaseClient();
    return librarySuccess(await readState(client, user.id, tmdbId));
  } catch (error) {
    report("MovieLibrary read", error);
    return libraryFail(
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
      return { error: "Invalid request", success: false };
    }

    const user = await getOptionalUser();
    if (!user || tmdbIds.length === 0) {
      return { success: true, watched: [], watchlist: [] };
    }

    const client = await createServerSupabaseClient();
    const [watched, watchlist] = await Promise.all([
      client
        .from("account_watched")
        .select("tmdb_id")
        .eq("account_id", user.id)
        .in("tmdb_id", tmdbIds),
      client
        .from("account_watchlist")
        .select("tmdb_id")
        .eq("account_id", user.id)
        .in("tmdb_id", tmdbIds),
    ]);
    if (watched.error) throw watched.error;
    if (watchlist.error) throw watchlist.error;

    return {
      success: true,
      watched: watched.data.map((row) => row.tmdb_id),
      watchlist: watchlist.data.map((row) => row.tmdb_id),
    };
  } catch (error) {
    report("MovieLibrary marks", error);
    return {
      error: toUserMessage(error, { fallback: "Could not load your library" }),
      success: false,
    };
  }
}

export async function setMovieLibraryAction(
  tmdbId: number,
  kind: MovieLibraryKind,
  active: boolean,
): Promise<MovieLibraryResult> {
  try {
    if (!isTmdbId(tmdbId) || !isMovieLibraryKind(kind)) {
      return libraryFail("Invalid request");
    }

    const user = await requireUser();
    const limit = await checkRateLimit(`library:${user.id}`, 120);
    if (!limit.success)
      return libraryFail("Too many requests, slow down a little");

    let movie: MovieDetails | null = null;
    if (active) {
      const result = await getMovieDetails(tmdbId);
      if (!result.success)
        return libraryFail("Could not load this movie, try again");
      movie = result.data;
    }

    const client = await createServerSupabaseClient();
    const { error } = movie
      ? await add(client, user.id, tmdbId, kind, movie)
      : await remove(client, user.id, tmdbId, kind);
    if (error) throw error;

    return librarySuccess(await readState(client, user.id, tmdbId));
  } catch (error) {
    report("MovieLibrary write", error);
    return libraryFail(
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
      return { error: "Invalid request", success: false };
    }

    const user = await requireUser();
    const limit = await checkRateLimit(`diary:${user.id}`, 60);
    if (!limit.success) {
      return { error: "Too many requests, slow down a little", success: false };
    }

    const result = await getMovieDetails(tmdbId);
    if (!result.success) {
      return { error: "Could not load this movie, try again", success: false };
    }

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
      if (error.message.includes("DIARY_DATE_IN_FUTURE")) {
        return {
          error: "You cannot log a movie in the future",
          success: false,
        };
      }
      if (error.message.includes("DIARY_DATE_BEFORE_LATEST_ENTRY")) {
        return {
          error: "This movie is already logged on a later day",
          success: false,
        };
      }
      throw error;
    }

    await rememberWatchedPayload(client, user.id, tmdbId, payload);
    return { success: true };
  } catch (error) {
    report("MovieDiary write", error);
    return {
      error: toUserMessage(error, { fallback: "Could not log this movie" }),
      success: false,
    };
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
      perMinute: 120,
      scope: "account-change",
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
      const position = [1, 2, 3, 4, 5].find((slot) => !used.has(slot));
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
      perMinute: 120,
      scope: "account-change",
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
