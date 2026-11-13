import "server-only";

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
import type { MediaType } from "@/lib/tmdb/shared";

const REVIEW_PAGE_SIZE = 20;

const REVIEW_SORT_COLUMNS = {
  likes_desc: ["likes_count", false],
  newest: ["updated_at", false],
  oldest: ["updated_at", true],
  rating_asc: ["rating", true],
  rating_desc: ["rating", false],
} as const;

const PROFILE_REVIEW_COLUMNS =
  "id, tmdb_id, media_type, title, poster_path, backdrop_path, release_date, content, rating, is_spoiler, likes_count, created_at, updated_at";

async function likedReviewIds(
  client: ProfileClient,
  viewerId: string | null,
  reviewIds: string[],
): Promise<Set<string>> {
  if (!viewerId || reviewIds.length === 0) return new Set();
  const { data } = await client
    .from("review_likes")
    .select("review_id")
    .eq("account_id", viewerId)
    .in("review_id", reviewIds);
  return new Set((data ?? []).map((row) => row.review_id));
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
  let query = client
    .from("reviews")
    .select(PROFILE_REVIEW_COLUMNS, { count: "exact" })
    .eq("account_id", accountId)
    .eq("media_type", mediaType)
    .not("tmdb_id", "is", null);

  if (filters.kind === "written") query = query.neq("content", "");
  if (filters.kind === "ratings") query = query.eq("content", "");
  if (filters.query) {
    const pattern = likePattern(filters.query);
    query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  const [column, ascending] = REVIEW_SORT_COLUMNS[filters.sort];

  const result = await readPage(
    query
      .order(column as "created_at", { ascending, nullsFirst: false })
      .order("id"),
    filters.page,
    REVIEW_PAGE_SIZE,
  );

  const rows = result.rows as ReviewRow[];
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
