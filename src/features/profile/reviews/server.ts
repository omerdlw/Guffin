import "server-only";

import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  ne,
  type SQL,
  sql,
} from "drizzle-orm";
import type { Session } from "@/infrastructure/db/client";
import { reviewLikes, reviews } from "@/infrastructure/db/schema";
import { getAmbientPalette } from "@/infrastructure/tmdb/server";
import { tmdbImageUrl } from "@/infrastructure/tmdb/shared";
import {
  REVIEWS_PAGE_SIZE,
  type ReviewKind,
  type ReviewSort,
  type ReviewSummary,
  type ReviewsPage,
} from "./reviews";

const ORDER: Record<ReviewSort, SQL> = {
  likes_desc: sql`${reviews.likesCount} desc`,
  newest: sql`${reviews.updatedAt} desc`,
  oldest: sql`${reviews.updatedAt} asc`,
  rating_asc: sql`${reviews.rating} asc nulls last`,
  rating_desc: sql`${reviews.rating} desc nulls last`,
};

function theirs(accountId: string) {
  return and(eq(reviews.accountId, accountId), isNotNull(reviews.tmdbId));
}

export async function getReviewsPage({
  accountId,
  kind,
  offset = 0,
  session,
  sort,
  viewerId,
}: {
  accountId: string;
  kind: ReviewKind;
  offset?: number;
  session: Session;
  sort: ReviewSort;
  viewerId: string | null;
}): Promise<ReviewsPage> {
  const rows = await session.db
    .select({
      content: reviews.content,
      id: reviews.id,
      isSpoiler: reviews.isSpoiler,
      likesCount: reviews.likesCount,
      posterPath: reviews.posterPath,
      rating: reviews.rating,
      releaseDate: reviews.releaseDate,
      title: reviews.title,
      tmdbId: reviews.tmdbId,
      updatedAt: reviews.updatedAt,
    })
    .from(reviews)
    .where(
      and(
        theirs(accountId),
        kind === "written" ? ne(reviews.content, "") : undefined,
        kind === "ratings" ? eq(reviews.content, "") : undefined,
      ),
    )
    .orderBy(ORDER[sort], sql`${reviews.updatedAt} desc`, asc(reviews.id))
    .limit(REVIEWS_PAGE_SIZE + 1)
    .offset(offset);

  const page = rows.slice(0, REVIEWS_PAGE_SIZE);
  const liked =
    viewerId && page.length > 0
      ? new Set(
          (
            await session.db
              .select({ id: reviewLikes.reviewId })
              .from(reviewLikes)
              .where(
                and(
                  eq(reviewLikes.accountId, viewerId),
                  inArray(
                    reviewLikes.reviewId,
                    page.map((row) => row.id),
                  ),
                ),
              )
          ).map((row) => row.id),
        )
      : new Set<string>();
  const tints =
    kind === "ratings"
      ? await Promise.all(
          page.map(async (row) => {
            const palette = await getAmbientPalette(
              tmdbImageUrl("poster", row.posterPath, "w185"),
            );
            return palette?.regions.bottom.color ?? null;
          }),
        )
      : [];

  return {
    items: page.flatMap((row, index) =>
      row.tmdbId === null
        ? []
        : [
            {
              content: row.content.trim(),
              id: row.id,
              isSpoiler: row.isSpoiler,
              liked: liked.has(row.id),
              likesCount: row.likesCount,
              posterPath: row.posterPath,
              rating: row.rating === null ? null : Number(row.rating),
              tint: tints[index] ?? null,
              title: row.title ?? "A film",
              tmdbId: row.tmdbId,
              updatedAt: row.updatedAt,
              year: row.releaseDate?.slice(0, 4) ?? null,
            },
          ],
    ),
    next: rows.length > REVIEWS_PAGE_SIZE ? offset + REVIEWS_PAGE_SIZE : null,
  };
}

export async function getReviewSummary({
  accountId,
  session,
}: {
  accountId: string;
  session: Session;
}): Promise<ReviewSummary> {
  const written = sql<boolean>`${reviews.content} <> ''`;
  const rows = await session.db
    .select({ rating: reviews.rating, total: count(), written })
    .from(reviews)
    .where(theirs(accountId))
    .groupBy(reviews.rating, written);

  const distribution = new Array<number>(10).fill(0);
  let sum = 0;
  let rated = 0;
  let texts = 0;
  for (const row of rows) {
    if (row.written) texts += row.total;
    const score = row.rating === null ? 0 : Number(row.rating);
    const step = Math.round(score * 2) - 1;
    if (step < 0 || step > 9) continue;
    distribution[step] += row.total;
    rated += row.total;
    sum += score * row.total;
  }

  return {
    average: rated > 0 ? sum / rated : null,
    distribution,
    rated,
    written: texts,
  };
}
