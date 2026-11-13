"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { rememberWatchedPayload } from "@/features/account/server";
import { getOptionalUser, mutate } from "@/features/auth/server";
import type { MutationResult as ReviewResult } from "@/features/auth/types";
import { fail, ok } from "@/features/auth/utils";
import { isUuid } from "@/lib/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTmdbId } from "@/lib/tmdb/transport";
import { ensureCatalogEntry } from "@/features/catalog/server";
import type { MediaType } from "@/features/catalog/types";
import { isMediaType } from "@/features/catalog/utils";
import { getMediaDetails, mediaSnapshot } from "@/lib/tmdb/server";
import { REVIEWS_PAGE_SIZE } from "./constants";
import { getMovieReviews, getReviewStats } from "./server";
import type {
  MovieReview,
  MovieReviewFilter,
  MovieReviewSort,
  ReviewInput,
  ReviewStats,
} from "./types";
import {
  normalizeReviewInput,
  getReviewValidationError,
  isMovieReviewFilter,
  isMovieReviewSort,
} from "./utils";

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
  mediaType: MediaType = "movie",
): Promise<ReviewResult<{ review: ReviewInput | null }>> {
  if (!isTmdbId(tmdbId) || !isMediaType(mediaType))
    return fail("Invalid title");
  try {
    const user = await getOptionalUser();
    if (!user) return ok({ review: null });

    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("reviews")
      .select("content, rating, is_spoiler")
      .eq("account_id", user.id)
      .eq("media_type", mediaType)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();
    if (error) throw error;

    return ok({
      review: data
        ? {
            content: data.content,
            isSpoiler: data.is_spoiler,
            rating: data.rating === null ? null : Number(data.rating),
          }
        : null,
    });
  } catch (error) {
    report("Review read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your review" }),
    );
  }
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
  mediaType: MediaType = "movie",
): Promise<
  ReviewResult<{
    reviews: MovieReview[];
    stats: ReviewStats;
    total: number;
    viewerId: string | null;
  }>
> {
  if (
    !isTmdbId(tmdbId) ||
    !isMediaType(mediaType) ||
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
  try {
    const [viewer, client] = await Promise.all([
      getOptionalUser(),
      createServerSupabaseClient(),
    ]);
    const viewerId = viewer?.id ?? null;
    const [{ reviews, total }, stats] = await Promise.all([
      getMovieReviews({
        client,
        filter,
        from,
        limit,
        mediaType,
        sort,
        tmdbId,
        username,
        viewerId,
      }),
      getReviewStats({ client, mediaType, tmdbId, username }),
    ]);
    return ok({ reviews, stats, total, viewerId });
  } catch (error) {
    report("Reviews page read", error);
    return fail(toUserMessage(error, { fallback: "Could not load reviews" }));
  }
}

export async function getViewerMovieReviewAction(
  tmdbId: number,
  mediaType: MediaType = "movie",
): Promise<ReviewResult<{ review: MovieReview | null }>> {
  if (!isTmdbId(tmdbId) || !isMediaType(mediaType)) {
    return fail("Invalid request");
  }
  try {
    const viewer = await getOptionalUser();
    if (!viewer) return ok({ review: null });
    const { reviews } = await getMovieReviews({
      authorId: viewer.id,
      client: await createServerSupabaseClient(),
      limit: 1,
      mediaType,
      sort: "newest",
      tmdbId,
      viewerId: viewer.id,
    });
    return ok({ review: reviews[0] ?? null });
  } catch (error) {
    report("Viewer review read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your review" }),
    );
  }
}

export async function saveMovieReviewAction(
  tmdbId: number,
  input: ReviewInput,
  mediaType: MediaType = "movie",
): Promise<ReviewResult> {
  const review = normalizeReviewInput(input);
  const problem = getReviewValidationError({
    content: review.content,
    rating: review.rating,
  });
  if (!isTmdbId(tmdbId) || !isMediaType(mediaType))
    return fail("Invalid title");
  if (problem) return fail(problem);

  return mutateReview(
    "Review save",
    "Could not save your review",
    async ({ client, userId }) => {
      const media = await getMediaDetails(mediaType, tmdbId);
      if (!media.success) return fail("Could not load this title, try again");
      if (mediaType === "tv") await ensureCatalogEntry("tv", tmdbId);

      const { backdrop_path, payload, poster_path, release_date, title } =
        mediaSnapshot(media.data.details);
      const { error } = await client.from("reviews").upsert(
        {
          account_id: userId,
          backdrop_path,
          content: review.content,
          is_spoiler: review.isSpoiler,
          poster_path,
          rating: review.rating,
          release_date,
          title,
          media_type: mediaType,
          tmdb_id: tmdbId,
        },
        { onConflict: "account_id,media_type,tmdb_id" },
      );
      if (error) throw error;
      if (mediaType === "movie") {
        await rememberWatchedPayload(client, userId, tmdbId, payload);
      }
      return ok();
    },
  );
}

export async function saveListCommentAction(
  listId: string,
  content: string,
): Promise<ReviewResult> {
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
    async ({ client, userId }) => {
      const { data: list, error: listError } = await client
        .from("lists")
        .select("account_id")
        .eq("id", listId)
        .maybeSingle();
      if (listError) throw listError;
      if (!list) return fail("This list is no longer available");
      if (list.account_id === userId) {
        return fail("You can't comment on your own list");
      }

      const { error } = await client
        .from("reviews")
        .upsert(
          { account_id: userId, content: text, list_id: listId },
          { onConflict: "account_id,list_id" },
        );
      if (error) throw error;
      return ok();
    },
  );
}

export async function deleteReviewAction(id: string): Promise<ReviewResult> {
  if (!isUuid(id)) return fail("Invalid request");
  return mutateReview(
    "Review delete",
    "Could not delete this review",
    async ({ client, userId }) => {
      const { error } = await client
        .from("reviews")
        .delete()
        .eq("id", id)
        .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}

export async function setReviewLikeAction(
  reviewId: string,
  liked: boolean,
): Promise<ReviewResult> {
  if (!isUuid(reviewId)) return fail("Invalid request");
  return mutateReview(
    "Review like",
    "Could not update your like",
    async ({ client, userId }) => {
      const { error } = liked
        ? await client
            .from("review_likes")
            .upsert(
              { account_id: userId, review_id: reviewId },
              { ignoreDuplicates: true, onConflict: "review_id,account_id" },
            )
        : await client
            .from("review_likes")
            .delete()
            .eq("review_id", reviewId)
            .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}
