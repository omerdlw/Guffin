import "server-only";

import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  lt,
  ne,
  type SQL,
  sql,
} from "drizzle-orm";
import type { Session } from "@/lib/db/client";
import { accountLikes, accounts, reviewLikes, reviews } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb/shared";
import type {
  MovieReview,
  MovieReviewFilter,
  MovieReviewSort,
  ReviewStats,
} from "./review";

interface ReviewRow {
  author: {
    avatar_url: string | null;
    display_name: string | null;
    id: string;
    username: string;
  } | null;
  content: string;
  created_at: string;
  id: string;
  is_spoiler: boolean;
  likes_count: number;
  rating: number | null;
  updated_at: string;
}

const REVIEW_COLUMNS = {
  author: {
    avatar_url: accounts.avatarUrl,
    display_name: accounts.displayName,
    id: accounts.id,
    username: sql<string>`${accounts.username}`,
  },
  content: reviews.content,
  created_at: reviews.createdAt,
  id: reviews.id,
  is_spoiler: reviews.isSpoiler,
  likes_count: reviews.likesCount,
  rating: reviews.rating,
  updated_at: reviews.updatedAt,
};

const REVIEW_ORDER: Record<MovieReviewSort, SQL> = {
  likes_asc: sql`${reviews.likesCount} asc nulls last`,
  likes_desc: sql`${reviews.likesCount} desc nulls last`,
  newest: sql`${reviews.updatedAt} desc nulls last`,
  oldest: sql`${reviews.updatedAt} asc nulls last`,
  rating_asc: sql`${reviews.rating} asc nulls last`,
  rating_desc: sql`${reviews.rating} desc nulls last`,
};

function toMovieReview(
  row: ReviewRow,
  author: NonNullable<ReviewRow["author"]>,
  liked: boolean,
  lovedBy: ReadonlySet<string>,
): MovieReview {
  return {
    author: {
      avatarUrl: author.avatar_url,
      displayName: author.display_name || author.username,
      id: author.id,
      username: author.username,
    },
    authorLiked: lovedBy.has(author.id),
    content: row.content,
    createdAt: row.created_at,
    id: row.id,
    isSpoiler: row.is_spoiler,
    liked,
    likesCount: row.likes_count,
    rating: row.rating === null ? null : Number(row.rating),
    updatedAt: row.updated_at,
  };
}

export async function getMovieReviews({
  authorId,
  filter = "all",
  from = 0,
  limit,
  mediaType = "movie",
  session,
  sort,
  tmdbId,
  username,
  viewerId,
}: {
  authorId?: string | null;
  filter?: MovieReviewFilter;
  from?: number;
  limit: number;
  mediaType?: MediaType;
  session: Session;
  sort: MovieReviewSort;
  tmdbId: number;
  username?: string | null;
  viewerId: string | null;
}): Promise<{ reviews: MovieReview[]; total: number }> {
  const conditions: (SQL | undefined)[] = [
    eq(reviews.mediaType, mediaType),
    eq(reviews.tmdbId, tmdbId),
  ];
  if (authorId) conditions.push(eq(reviews.accountId, authorId));
  if (username) conditions.push(eq(accounts.username, username.toLowerCase()));
  if (filter === "written") conditions.push(ne(reviews.content, ""));
  else if (filter !== "all") {
    const stars = Number(filter);
    conditions.push(gte(reviews.rating, stars), lt(reviews.rating, stars + 1));
  }
  const where = and(...conditions);

  const [rows, [counted]] = await Promise.all([
    session.db
      .select(REVIEW_COLUMNS)
      .from(reviews)
      .innerJoin(accounts, eq(accounts.id, reviews.accountId))
      .where(where)
      .orderBy(REVIEW_ORDER[sort], asc(reviews.id))
      .limit(limit)
      .offset(from),
    session.db
      .select({ total: count() })
      .from(reviews)
      .innerJoin(accounts, eq(accounts.id, reviews.accountId))
      .where(where),
  ]);

  const authors = rows.map((row) => row.author.id);
  const [likes, fans] = await Promise.all([
    viewerId && rows.length > 0
      ? session.db
          .select({ reviewId: reviewLikes.reviewId })
          .from(reviewLikes)
          .where(
            and(
              eq(reviewLikes.accountId, viewerId),
              inArray(
                reviewLikes.reviewId,
                rows.map((row) => row.id),
              ),
            ),
          )
      : [],
    authors.length > 0
      ? session.db
          .select({ accountId: accountLikes.accountId })
          .from(accountLikes)
          .where(
            and(
              eq(accountLikes.mediaType, mediaType),
              eq(accountLikes.tmdbId, tmdbId),
              inArray(accountLikes.accountId, authors),
            ),
          )
      : [],
  ]);
  const liked = new Set(likes.map((like) => like.reviewId));
  const lovedBy = new Set(fans.map((fan) => fan.accountId));

  return {
    reviews: rows.map((row) =>
      toMovieReview(row, row.author, liked.has(row.id), lovedBy),
    ),
    total: counted?.total ?? 0,
  };
}

export async function getReviewStats({
  mediaType = "movie",
  session,
  tmdbId,
  username,
}: {
  mediaType?: MediaType;
  session: Session;
  tmdbId: number;
  username?: string | null;
}): Promise<ReviewStats> {
  const data = await session.call("get_review_stats", {
    p_media_type: mediaType,
    p_tmdb_id: tmdbId,
    p_username: username ? username.toLowerCase() : null,
  });

  const stats = data[0];
  const average = stats?.average ?? null;
  return {
    average: average === null ? null : Number(average),
    rated: Number(stats?.rated ?? 0),
    total: Number(stats?.total ?? 0),
  };
}
