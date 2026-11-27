"use server";
import "server-only";

import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { fail, type ActionResult, ok } from "@/shared/result";
import { mutate, query, requireUser } from "@/features/auth/server";
import { isUuid } from "@/shared/http";
import { and, eq, inArray } from "drizzle-orm";
import {
  pgError,
  pgErrorCode,
  type Session,
  viewer,
} from "@/infrastructure/db/client";
import {
  accountDiary,
  accountFavorites,
  accountLikes,
  accountWatched,
  accountWatchlist,
  reviews,
} from "@/infrastructure/db/schema";
import { checkRateLimit } from "@/infrastructure/security";
import { getMovieDetails, movieSnapshot } from "@/infrastructure/tmdb/server";
import type { MovieDetails } from "@/infrastructure/tmdb/model";
import { isTmdbId } from "@/infrastructure/tmdb/transport";
import {
  type AccountPatchInput,
  type CurrentAccount,
  EMPTY_MOVIE_LIBRARY,
  FAVORITES_MAX,
  MOVIE_LIBRARY_KINDS,
  type MovieLibraryKind,
  type MovieLibraryState,
} from "./model";
import {
  rememberWatchedPayload,
  revalidateAccount,
  updateAccount,
} from "./queries";

type MovieLibraryResult = ActionResult<{ state: MovieLibraryState }>;

type DiaryLogResult = ActionResult;

type LibraryMarksResult = ActionResult<{
  watched: number[];
  watchlist: number[];
}>;

const LIBRARY_TABLES = {
  liked: accountLikes,
  watched: accountWatched,
  watchlist: accountWatchlist,
} as const;

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

export async function updateAccountAction(
  input: AccountPatchInput,
): Promise<ActionResult<{ account: CurrentAccount }>> {
  const fallback = "Your account couldn't be updated. Please try again";
  return mutate(
    { fallback, name: "Account update" },
    async ({ session, userId }) => {
      const { account } = await updateAccount({ input, session, userId });
      if (!account) return fail(fallback);

      revalidateAccount(account.username);
      return ok({ account });
    },
  );
}

async function readLibraryState(
  session: Session,
  accountId: string,
  tmdbId: number,
): Promise<MovieLibraryState> {
  const results = await Promise.all(
    MOVIE_LIBRARY_KINDS.map((kind) => {
      const table = LIBRARY_TABLES[kind];
      return session.db
        .select({ tmdbId: table.tmdbId })
        .from(table)
        .where(and(eq(table.accountId, accountId), eq(table.tmdbId, tmdbId)))
        .limit(1);
    }),
  );

  const state = { ...EMPTY_MOVIE_LIBRARY };
  MOVIE_LIBRARY_KINDS.forEach((kind, index) => {
    state[kind] = results[index]!.length > 0;
  });
  return state;
}

async function readMarkedIds(
  session: Session,
  table: typeof LIBRARY_TABLES.watched | typeof LIBRARY_TABLES.watchlist,
  accountId: string,
  tmdbIds: number[],
): Promise<number[]> {
  const rows = await session.db
    .select({ tmdbId: table.tmdbId })
    .from(table)
    .where(and(eq(table.accountId, accountId), inArray(table.tmdbId, tmdbIds)));
  return rows.map((row) => row.tmdbId);
}

async function libraryConflict(
  session: Session,
  accountId: string,
  tmdbId: number,
  { active, kind }: { active: boolean; kind: MovieLibraryKind },
): Promise<string | null> {
  if (kind === "watched" && !active) {
    const [review] = await session.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.accountId, accountId), eq(reviews.tmdbId, tmdbId)))
      .limit(1);
    return review
      ? "Delete your review before unmarking this as watched"
      : null;
  }
  if (kind === "watchlist" && active) {
    const [watched] = await session.db
      .select({ tmdbId: accountWatched.tmdbId })
      .from(accountWatched)
      .where(
        and(
          eq(accountWatched.accountId, accountId),
          eq(accountWatched.tmdbId, tmdbId),
        ),
      )
      .limit(1);
    return watched ? "You've already watched this" : null;
  }
  return null;
}

async function writeLibraryEntry(
  session: Session,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
  media: MovieDetails | null,
): Promise<void> {
  const table = LIBRARY_TABLES[kind];
  if (!media) {
    await session.db
      .delete(table)
      .where(and(eq(table.accountId, accountId), eq(table.tmdbId, tmdbId)));
    return;
  }
  await session.db
    .insert(table)
    .values({ accountId, tmdbId, ...movieSnapshot(media) })
    .onConflictDoNothing({ target: [table.accountId, table.tmdbId] });
}

export async function getMovieLibraryAction(
  tmdbId: number,
): Promise<MovieLibraryResult> {
  if (!isTmdbId(tmdbId)) return fail("Invalid title");
  return query(
    { fallback: "Could not load your library", name: "MovieLibrary read" },
    async ({ session, userId }) =>
      ok({
        state: userId
          ? await readLibraryState(session, userId, tmdbId)
          : EMPTY_MOVIE_LIBRARY,
      }),
  );
}

export async function getLibraryMarksAction(
  tmdbIds: number[],
): Promise<LibraryMarksResult> {
  if (
    !Array.isArray(tmdbIds) ||
    tmdbIds.length > LIBRARY_MARKS_MAX ||
    !tmdbIds.every(isTmdbId)
  ) {
    return fail("Invalid request");
  }
  return query(
    { fallback: "Could not load your library", name: "MovieLibrary marks" },
    async ({ session, userId }) => {
      if (!userId || tmdbIds.length === 0) {
        return ok({ watched: [], watchlist: [] });
      }
      const [watched, watchlist] = await Promise.all([
        readMarkedIds(session, LIBRARY_TABLES.watched, userId, tmdbIds),
        readMarkedIds(session, LIBRARY_TABLES.watchlist, userId, tmdbIds),
      ]);
      return ok({ watched, watchlist });
    },
  );
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

    const session = viewer(user.id);

    const problem = await libraryConflict(session, user.id, tmdbId, {
      active,
      kind,
    });
    if (problem) return fail(problem);

    let media: MovieDetails | null = null;
    if (active) {
      const result = await getMovieDetails(tmdbId);
      if (!result.success) return fail("Could not load this title, try again");
      media = result.data;
    }

    await writeLibraryEntry(session, user.id, tmdbId, kind, media);

    return ok({ state: await readLibraryState(session, user.id, tmdbId) });
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

    const { payload, ...snapshot } = movieSnapshot(result.data);

    const session = viewer(user.id);
    try {
      await session.db.insert(accountDiary).values({
        accountId: user.id,
        ...snapshot,
        tmdbId,
        watchedOn,
      });
    } catch (error) {
      const message = pgError(error)?.message ?? "";
      const known = Object.keys(DIARY_INSERT_ERRORS).find((code) =>
        message.includes(code),
      );
      if (known) return fail(DIARY_INSERT_ERRORS[known]);
      throw error;
    }

    await rememberWatchedPayload(session, user.id, tmdbId, payload);
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
  if (!isTmdbId(tmdbId)) {
    return fail("Invalid title");
  }

  return mutate(
    {
      fallback: "Could not update your favorites",
      name: "Favorite write",
    },
    async ({ session, userId }) => {
      const mine = eq(accountFavorites.accountId, userId);
      if (!pinned) {
        await session.db
          .delete(accountFavorites)
          .where(and(mine, eq(accountFavorites.tmdbId, tmdbId)));
        return ok();
      }

      const rows = await session.db
        .select({
          position: accountFavorites.position,
          tmdbId: accountFavorites.tmdbId,
        })
        .from(accountFavorites)
        .where(mine);
      if (rows.some((row) => row.tmdbId === tmdbId)) return ok();
      if (rows.length >= FAVORITES_MAX) {
        return fail(`You can pin up to ${FAVORITES_MAX} favorites`);
      }

      const used = new Set(rows.map((row) => row.position));
      const position = Array.from(
        { length: FAVORITES_MAX },
        (_, index) => index + 1,
      ).find((slot) => !used.has(slot));
      if (!position) return fail("Your favorites are full");

      try {
        await session.db.insert(accountFavorites).values({
          accountId: userId,
          position,
          tmdbId,
        });
      } catch (error) {
        if (pgErrorCode(error) === "23503") {
          return fail("Like this movie to pin it");
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
    async ({ session, userId }) => {
      await session.db
        .delete(accountDiary)
        .where(
          and(eq(accountDiary.id, id), eq(accountDiary.accountId, userId)),
        );
      return ok();
    },
  );
}
