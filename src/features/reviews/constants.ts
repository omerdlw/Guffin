import type { MovieReviewSort } from "./types";

export const REVIEW_MIN_LENGTH = 10;

export const REVIEW_MAX_LENGTH = 800;

export const REVIEWS_PAGE_SIZE = 20;

export const MOVIE_REVIEW_SORTS = [
  { label: "Newest to oldest", value: "newest" },
  { label: "Oldest to newest", value: "oldest" },
  { label: "Highest rating to lowest rating", value: "rating_desc" },
  { label: "Lowest rating to highest rating", value: "rating_asc" },
  { label: "Most liked to least liked", value: "likes_desc" },
  { label: "Least liked to most liked", value: "likes_asc" },
] as const;

export const MOVIE_REVIEW_FILTERS = [
  { label: "All entries", value: "all" },
  { label: "Written reviews", value: "written" },
  { label: "5 stars", value: "5" },
  { label: "4 stars", value: "4" },
  { label: "3 stars", value: "3" },
  { label: "2 stars", value: "2" },
  { label: "1 star", value: "1" },
] as const;

export const REVIEW_EVENTS = Object.freeze({ CHANGE: "reviews:change" });

export const REVIEW_EDITOR_SURFACE_WIDTH = 560;

export const STAR_PATH =
  "M12.74 3.98 L14.26 8.05 Q14.47 8.60 15.06 8.63 L19.40 8.82 Q21.51 8.91 19.85 10.23 L16.45 12.93 Q15.99 13.30 16.15 13.87 L17.31 18.05 Q17.88 20.09 16.12 18.92 L12.49 16.53 Q12 16.20 11.51 16.53 L7.88 18.92 Q6.12 20.09 6.69 18.05 L7.85 13.87 Q8.01 13.30 7.55 12.93 L4.15 10.23 Q2.49 8.91 4.60 8.82 L8.94 8.63 Q9.53 8.60 9.74 8.05 L11.26 3.98 Q12 2 12.74 3.98Z";

export const STAR_GAP = 2;

export const REVIEW_COLUMNS =
  "id, content, rating, is_spoiler, likes_count, created_at, updated_at, author:accounts!reviews_account_id_fkey!inner(id, username, display_name, avatar_url)";

export const REVIEW_ORDER: Record<MovieReviewSort, [string, boolean]> = {
  likes_asc: ["likes_count", true],
  likes_desc: ["likes_count", false],
  newest: ["updated_at", false],
  oldest: ["updated_at", true],
  rating_asc: ["rating", true],
  rating_desc: ["rating", false],
};
