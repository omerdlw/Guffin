import "server-only";

import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { paged } from "@/features/profile/params";
import {
  likePattern,
  type Paged,
  type ProfileClient,
  type ReviewCardData,
  type ReviewFilters,
  type ReviewRow,
  toReviewCard,
} from "@/features/profile/profile";
import { readPage } from "@/features/profile/server";
import { pick } from "@/lib/db/pick";
import { reviewLikes, reviews } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb/shared";

const REVIEW_PAGE_SIZE = 20;

const REVIEW_ORDER: Record<ReviewFilters["sort"], SQL> = {
  likes_desc: sql`${reviews.likesCount} desc nulls last`,
  newest: sql`${reviews.updatedAt} desc nulls last`,
  oldest: sql`${reviews.updatedAt} asc nulls last`,
  rating_asc: sql`${reviews.rating} asc nulls last`,
  rating_desc: sql`${reviews.rating} desc nulls last`,
};

const PROFILE_REVIEW_COLUMNS = pick(reviews, [
  "id",
  "tmdb_id",
  "media_type",
  "title",
  "poster_path",
  "backdrop_path",
  "release_date",
  "content",
  "rating",
  "is_spoiler",
  "likes_count",
  "created_at",
  "updated_at",
]);

async function likedReviewIds(
  client: ProfileClient,
  viewerId: string | null,
  reviewIds: string[],
): Promise<Set<string>> {
  if (!viewerId || reviewIds.length === 0) return new Set();
  const data = await client.db
    .select({ reviewId: reviewLikes.reviewId })
    .from(reviewLikes)
    .where(
      and(
        eq(reviewLikes.accountId, viewerId),
        inArray(reviewLikes.reviewId, reviewIds),
      ),
    );
  return new Set(data.map((row) => row.reviewId));
}

export async function getReviewsPage({
  accountId,
  client,
  filters,
  mediaType = "movie",
  viewerId,
}: {
  accountId: string;
  client: ProfileClient;
  filters: ReviewFilters;
  mediaType?: MediaType;
  viewerId: string | null;
}): Promise<Paged<ReviewCardData>> {
  const conditions: (SQL | undefined)[] = [
    eq(reviews.accountId, accountId),
    eq(reviews.mediaType, mediaType),
    isNotNull(reviews.tmdbId),
  ];
  if (filters.kind === "written") conditions.push(ne(reviews.content, ""));
  if (filters.kind === "ratings") conditions.push(eq(reviews.content, ""));
  if (filters.query) {
    const pattern = likePattern(filters.query);
    conditions.push(
      or(ilike(reviews.title, pattern), ilike(reviews.content, pattern)),
    );
  }
  const where = and(...conditions);

  const result = await readPage(
    {
      count: async () => {
        const [row] = await client.db
          .select({ total: count() })
          .from(reviews)
          .where(where);
        return row?.total ?? 0;
      },
      rows: (limit, offset) =>
        client.db
          .select(PROFILE_REVIEW_COLUMNS)
          .from(reviews)
          .where(where)
          .orderBy(REVIEW_ORDER[filters.sort], asc(reviews.id))
          .limit(limit)
          .offset(offset),
    },
    filters.page,
    REVIEW_PAGE_SIZE,
  );

  const rows: ReviewRow[] = result.rows;
  const liked = await likedReviewIds(
    client,
    viewerId,
    rows.map((row) => row.id),
  );

  return paged(
    rows.flatMap((row) => toReviewCard(row, liked)),
    result.count,
    result.page,
    REVIEW_PAGE_SIZE,
  );
}
