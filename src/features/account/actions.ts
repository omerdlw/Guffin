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
import { and, eq, inArray } from "drizzle-orm";
import { pgError, pgErrorCode, type Session, viewer } from "@/lib/db/client";
import {
  accountDiary,
  accountFavorites,
  accountLikes,
  accountWatched,
  accountWatchlist,
} from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/security";
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

type LibraryMarksResult = MutationResult<{
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
      const { account } = await updateAccount({
        input,
        session: viewer(user.id),
        userId: user.id,
      });
      if (!account) return err(fallback);

      revalidateAccount(account.username);
      return okResult(account);
    },
  );
}

function libraryWhere(
  table: (typeof LIBRARY_TABLES)[MovieLibraryKind],
  accountId: string,
  mediaType: MediaType,
) {
  return and(eq(table.accountId, accountId), eq(table.mediaType, mediaType));
}

async function readLibraryState(
  session: Session,
  accountId: string,
  tmdbId: number,
  mediaType: MediaType,
): Promise<MovieLibraryState> {
  const results = await Promise.all(
    MOVIE_LIBRARY_KINDS.map((kind) => {
      const table = LIBRARY_TABLES[kind];
      return session.db
        .select({ tmdbId: table.tmdbId })
        .from(table)
        .where(
          and(
            libraryWhere(table, accountId, mediaType),
            eq(table.tmdbId, tmdbId),
          ),
        )
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
  mediaType: MediaType,
): Promise<number[]> {
  const rows = await session.db
    .select({ tmdbId: table.tmdbId })
    .from(table)
    .where(
      and(
        libraryWhere(table, accountId, mediaType),
        inArray(table.tmdbId, tmdbIds),
      ),
    );
  return rows.map((row) => row.tmdbId);
}

async function writeLibraryEntry(
  session: Session,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
  mediaType: MediaType,
  media: MovieDetails | ShowDetails | null,
): Promise<void> {
  const table = LIBRARY_TABLES[kind];
  if (!media) {
    await session.db
      .delete(table)
      .where(
        and(
          libraryWhere(table, accountId, mediaType),
          eq(table.tmdbId, tmdbId),
        ),
      );
    return;
  }
  await session.db
    .insert(table)
    .values({ accountId, mediaType, tmdbId, ...mediaSnapshot(media) })
    .onConflictDoNothing({
      target: [table.accountId, table.mediaType, table.tmdbId],
    });
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

    return ok({
      state: await readLibraryState(
        viewer(user.id),
        user.id,
        tmdbId,
        mediaType,
      ),
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

    const session = viewer(user.id);
    const [watched, watchlist] = await Promise.all([
      readMarkedIds(
        session,
        LIBRARY_TABLES.watched,
        user.id,
        tmdbIds,
        mediaType,
      ),
      readMarkedIds(
        session,
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

    const session = viewer(user.id);

    if (mediaType === "tv" && kind === "watched") {
      if (!(await ensureCatalogEntry("tv", tmdbId))) {
        return fail("Could not load this show, try again");
      }
      await setShowCompleted(session, user.id, tmdbId, active);
      return ok({
        state: await readLibraryState(session, user.id, tmdbId, mediaType),
      });
    }

    let media: MovieDetails | ShowDetails | null = null;
    if (active) {
      const result = await getMediaDetails(mediaType, tmdbId);
      if (!result.success) return fail("Could not load this title, try again");
      media = result.data.details;
      if (mediaType === "tv") await ensureCatalogEntry("tv", tmdbId);
    }

    await writeLibraryEntry(session, user.id, tmdbId, kind, mediaType, media);

    return ok({
      state: await readLibraryState(session, user.id, tmdbId, mediaType),
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
    async ({ session, userId }) => {
      const mine = and(
        eq(accountFavorites.accountId, userId),
        eq(accountFavorites.mediaType, mediaType),
      );
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
          mediaType,
          position,
          tmdbId,
        });
      } catch (error) {
        if (pgErrorCode(error) === "23503") {
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
    async ({ session, userId }) => {
      await session.db
        .delete(accountDiary)
        .where(and(eq(accountDiary.id, id), eq(accountDiary.accountId, userId)));
      return ok();
    },
  );
}
