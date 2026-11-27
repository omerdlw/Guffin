"use server";
import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { rememberWatchedPayload } from "@/features/account/queries";
import { mutate, query } from "@/features/auth/server";
import { lists, reviewLikes, reviews } from "@/infrastructure/db/schema";
import { getMovieDetails, movieSnapshot } from "@/infrastructure/tmdb/server";
import { isTmdbId } from "@/infrastructure/tmdb/transport";
import { isUuid } from "@/shared/http";
import { fail, type ActionResult, ok } from "@/shared/result";
import {
  getReviewValidationError,
  isMovieReviewFilter,
  isMovieReviewSort,
  type MovieReview,
  type MovieReviewFilter,
  type MovieReviewSort,
  type ReviewInput,
  REVIEWS_PAGE_SIZE,
  type ReviewStats,
} from "./model";
import { getMovieReviews, getReviewStats } from "./queries";

function normalizeReviewInput(input: ReviewInput): ReviewInput {
  const content =
    typeof input?.content === "string" ? input.content.trim() : "";
  return {
    content,
    isSpoiler: Boolean(input?.isSpoiler) && content.length > 0,
    rating: typeof input?.rating === "number" ? input.rating : null,
  };
}

function mutateReview<T extends object = object>(
  name: string,
  fallback: string,
  work: Parameters<typeof mutate<T>>[1],
) {
  return mutate<T>(
    { fallback, name, perMinute: 60, scope: "review-change" },
    work,
  );
}

export async function getOwnMovieReviewAction(
  tmdbId: number,
): Promise<ActionResult<{ review: ReviewInput | null }>> {
  if (!isTmdbId(tmdbId)) return fail("Invalid title");
  return query(
    { fallback: "Could not load your review", name: "Review read" },
    async ({ session, userId }) => {
      if (!userId) return ok({ review: null });

      const [data] = await session.db
        .select({
          content: reviews.content,
          isSpoiler: reviews.isSpoiler,
          rating: reviews.rating,
        })
        .from(reviews)
        .where(and(eq(reviews.accountId, userId), eq(reviews.tmdbId, tmdbId)))
        .limit(1);

      return ok({
        review: data
          ? {
              content: data.content,
              isSpoiler: data.isSpoiler,
              rating: data.rating === null ? null : Number(data.rating),
            }
          : null,
      });
    },
  );
}

export async function getMovieReviewsPageAction(
  tmdbId: number,
  {
    filter,
    from,
    limit = REVIEWS_PAGE_SIZE,
    sort,
    username,
  }: {
    filter: MovieReviewFilter;
    from: number;
    limit?: number;
    sort: MovieReviewSort;
    username: string | null;
  },
): Promise<
  ActionResult<{
    reviews: MovieReview[];
    stats: ReviewStats;
    total: number;
    viewerId: string | null;
  }>
> {
  if (
    !isTmdbId(tmdbId) ||
    !isMovieReviewSort(sort) ||
    !isMovieReviewFilter(filter) ||
    !Number.isInteger(from) ||
    from < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > REVIEWS_PAGE_SIZE ||
    (username !== null && typeof username !== "string")
  ) {
    return fail("Invalid request");
  }
  return query(
    { fallback: "Could not load reviews", name: "Reviews page read" },
    async ({ session, userId }) => {
      const [{ reviews: page, total }, stats] = await Promise.all([
        getMovieReviews({
          session,
          filter,
          from,
          limit,
          sort,
          tmdbId,
          username,
          viewerId: userId,
        }),
        getReviewStats({ session, tmdbId, username }),
      ]);
      return ok({ reviews: page, stats, total, viewerId: userId });
    },
  );
}

export async function getMemberReviewAction(
  tmdbId: number,
  username: string,
): Promise<
  ActionResult<{
    film: { posterPath: string | null; title: string; year: number | null };
    review: MovieReview | null;
    viewerId: string | null;
  }>
> {
  if (!isTmdbId(tmdbId) || typeof username !== "string" || !username) {
    return fail("Invalid request");
  }
  return query(
    { fallback: "Could not load the review", name: "Member review read" },
    async ({ session, userId }) => {
      const [{ reviews: found }, media] = await Promise.all([
        getMovieReviews({
          limit: 1,
          session,
          sort: "newest",
          tmdbId,
          username,
          viewerId: userId,
        }),
        getMovieDetails(tmdbId),
      ]);
      if (!media.success) return fail("Could not load this title");
      const { posterPath, releaseYear, title } = media.data;
      return ok({
        film: { posterPath, title, year: releaseYear ?? null },
        review: found[0] ?? null,
        viewerId: userId,
      });
    },
  );
}

export async function getViewerMovieReviewAction(
  tmdbId: number,
): Promise<ActionResult<{ review: MovieReview | null }>> {
  if (!isTmdbId(tmdbId)) return fail("Invalid request");
  return query(
    { fallback: "Could not load your review", name: "Viewer review read" },
    async ({ session, userId }) => {
      if (!userId) return ok({ review: null });
      const { reviews: own } = await getMovieReviews({
        authorId: userId,
        limit: 1,
        session,
        sort: "newest",
        tmdbId,
        viewerId: userId,
      });
      return ok({ review: own[0] ?? null });
    },
  );
}

export async function saveMovieReviewAction(
  tmdbId: number,
  input: ReviewInput,
): Promise<ActionResult> {
  const review = normalizeReviewInput(input);
  const problem = getReviewValidationError({
    content: review.content,
    rating: review.rating,
  });
  if (!isTmdbId(tmdbId)) return fail("Invalid title");
  if (problem) return fail(problem);

  return mutateReview(
    "Review save",
    "Could not save your review",
    async ({ session, userId }) => {
      const media = await getMovieDetails(tmdbId);
      if (!media.success) return fail("Could not load this title, try again");

      const { payload, ...snapshot } = movieSnapshot(media.data);
      const fields = {
        ...snapshot,
        content: review.content,
        isSpoiler: review.isSpoiler,
        rating: review.rating,
      };
      await session.db
        .insert(reviews)
        .values({ ...fields, accountId: userId, tmdbId })
        .onConflictDoUpdate({
          set: fields,
          target: [reviews.accountId, reviews.tmdbId],
          targetWhere: sql`${reviews.tmdbId} is not null`,
        });
      await rememberWatchedPayload(session, userId, tmdbId, payload);
      return ok();
    },
  );
}

export async function saveListCommentAction(
  listId: string,
  content: string,
): Promise<ActionResult> {
  const text = typeof content === "string" ? content.trim() : "";
  const problem = getReviewValidationError({
    allowRating: false,
    content: text,
    rating: null,
    requireText: true,
    textLabel: "comment",
  });
  if (!isUuid(listId)) return fail("Invalid request");
  if (problem) return fail(problem);

  return mutateReview(
    "List comment",
    "Could not post your comment",
    async ({ session, userId }) => {
      const [list] = await session.db
        .select({ accountId: lists.accountId })
        .from(lists)
        .where(eq(lists.id, listId))
        .limit(1);
      if (!list) return fail("This list is no longer available");
      if (list.accountId === userId) {
        return fail("You can't comment on your own list");
      }

      await session.db
        .insert(reviews)
        .values({ accountId: userId, content: text, listId })
        .onConflictDoUpdate({
          set: { content: text },
          target: [reviews.accountId, reviews.listId],
        });
      return ok();
    },
  );
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Invalid request");
  return mutateReview(
    "Review delete",
    "Could not delete this review",
    async ({ session, userId }) => {
      await session.db
        .delete(reviews)
        .where(and(eq(reviews.id, id), eq(reviews.accountId, userId)));
      return ok();
    },
  );
}

export async function setReviewLikeAction(
  reviewId: string,
  liked: boolean,
): Promise<ActionResult> {
  if (!isUuid(reviewId)) return fail("Invalid request");
  return mutateReview(
    "Review like",
    "Could not update your like",
    async ({ session, userId }) => {
      if (liked) {
        await session.db
          .insert(reviewLikes)
          .values({ accountId: userId, reviewId })
          .onConflictDoNothing();
      } else {
        await session.db
          .delete(reviewLikes)
          .where(
            and(
              eq(reviewLikes.reviewId, reviewId),
              eq(reviewLikes.accountId, userId),
            ),
          );
      }
      return ok();
    },
  );
}
