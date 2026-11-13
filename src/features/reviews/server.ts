import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MediaType } from "@/lib/tmdb/shared";
import type {
  MovieReview,
  MovieReviewFilter,
  MovieReviewSort,
  ReviewStats,
} from "./review";

type ReviewsClient = SupabaseClient<Database>;

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

const REVIEW_COLUMNS =
  "id, content, rating, is_spoiler, likes_count, created_at, updated_at, author:accounts!reviews_account_id_fkey!inner(id, username, display_name, avatar_url)";

const REVIEW_ORDER: Record<MovieReviewSort, [string, boolean]> = {
  likes_asc: ["likes_count", true],
  likes_desc: ["likes_count", false],
  newest: ["updated_at", false],
  oldest: ["updated_at", true],
  rating_asc: ["rating", true],
  rating_desc: ["rating", false],
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
  client,
  filter = "all",
  from = 0,
  limit,
  mediaType = "movie",
  sort,
  tmdbId,
  username,
  viewerId,
}: {
  authorId?: string | null;
  client: ReviewsClient;
  filter?: MovieReviewFilter;
  from?: number;
  limit: number;
  mediaType?: MediaType;
  sort: MovieReviewSort;
  tmdbId: number;
  username?: string | null;
  viewerId: string | null;
}): Promise<{ reviews: MovieReview[]; total: number }> {
  const [column, ascending] = REVIEW_ORDER[sort];

  let query = client
    .from("reviews")
    .select(REVIEW_COLUMNS, { count: "exact" })
    .eq("media_type", mediaType)
    .eq("tmdb_id", tmdbId);
  if (authorId) query = query.eq("account_id", authorId);
  if (username) query = query.eq("author.username", username.toLowerCase());
  if (filter === "written") query = query.neq("content", "");
  else if (filter !== "all") {
    const stars = Number(filter);
    query = query.gte("rating", stars).lt("rating", stars + 1);
  }

  const { count, data, error } = await query
    .order(column as "created_at", { ascending, nullsFirst: false })
    .order("id")
    .range(from, from + limit - 1);
  if (error?.code === "PGRST103") {
    const rows = Number(/only (\d+) rows/.exec(error.details ?? "")?.[1]);
    return { reviews: [], total: Number.isFinite(rows) ? rows : 0 };
  }
  if (error) throw error;

  const rows = (data ?? []) as unknown as ReviewRow[];
  const authors = rows.flatMap((row) => (row.author ? [row.author.id] : []));
  const [likes, fans] = await Promise.all([
    viewerId && rows.length > 0
      ? client
          .from("review_likes")
          .select("review_id")
          .eq("account_id", viewerId)
          .in(
            "review_id",
            rows.map((row) => row.id),
          )
      : null,
    authors.length > 0
      ? client
          .from("account_likes")
          .select("account_id")
          .eq("media_type", mediaType)
          .eq("tmdb_id", tmdbId)
          .in("account_id", authors)
      : null,
  ]);
  const liked = new Set((likes?.data ?? []).map((like) => like.review_id));
  const lovedBy = new Set((fans?.data ?? []).map((fan) => fan.account_id));

  return {
    reviews: rows.flatMap((row) =>
      row.author
        ? [toMovieReview(row, row.author, liked.has(row.id), lovedBy)]
        : [],
    ),
    total: count ?? 0,
  };
}

export async function getReviewStats({
  client,
  mediaType = "movie",
  tmdbId,
  username,
}: {
  client: ReviewsClient;
  mediaType?: MediaType;
  tmdbId: number;
  username?: string | null;
}): Promise<ReviewStats> {
  const { data, error } = await client.rpc("get_review_stats", {
    p_media_type: mediaType,
    p_tmdb_id: tmdbId,
    p_username: username ? username.toLowerCase() : null,
  });
  if (error) throw error;

  const stats = data?.[0];
  const average = stats?.average ?? null;
  return {
    average: average === null ? null : Number(average),
    rated: Number(stats?.rated ?? 0),
    total: Number(stats?.total ?? 0),
  };
}
