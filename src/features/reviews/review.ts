export interface ReviewInput {
  content: string;
  isSpoiler: boolean;
  rating: number | null;
}

export interface MovieReview {
  author: {
    avatarUrl: string | null;
    displayName: string;
    id: string;
    username: string;
  };
  authorLiked: boolean;
  content: string;
  createdAt: string;
  id: string;
  isSpoiler: boolean;
  liked: boolean;
  likesCount: number;
  rating: number | null;
  updatedAt: string;
}

export interface ReviewStats {
  average: number | null;
  rated: number;
  total: number;
}

export type MovieReviewSort = (typeof MOVIE_REVIEW_SORTS)[number]["value"];

export type MovieReviewFilter = (typeof MOVIE_REVIEW_FILTERS)[number]["value"];

const REVIEW_MIN_LENGTH = 10;

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

export function isMovieReviewSort(value: unknown): value is MovieReviewSort {
  return MOVIE_REVIEW_SORTS.some((sort) => sort.value === value);
}

export function isMovieReviewFilter(
  value: unknown,
): value is MovieReviewFilter {
  return MOVIE_REVIEW_FILTERS.some((filter) => filter.value === value);
}

function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0.5 &&
    value <= 5 &&
    value * 2 === Math.trunc(value * 2)
  );
}

export function getReviewValidationError({
  allowRating = true,
  content,
  rating,
  requireText = false,
  textLabel = "review",
}: {
  allowRating?: boolean;
  content: string;
  rating: number | null;
  requireText?: boolean;
  textLabel?: "comment" | "review";
}): string | null {
  const text = content.trim();
  const label = textLabel === "comment" ? "Comment" : "Review";

  if (rating !== null && !isValidRating(rating)) return "Rating is invalid";
  if (!allowRating && rating !== null) return "Lists only support comments";
  if (requireText && !text) return "Write a comment to share your thoughts";
  if (!text && rating === null) return "Add a score or write a review";
  if (text && text.length < REVIEW_MIN_LENGTH) {
    return `${label} must be at least ${REVIEW_MIN_LENGTH} characters long`;
  }
  if (text.length > REVIEW_MAX_LENGTH) {
    return `${label} must be at most ${REVIEW_MAX_LENGTH} characters long`;
  }
  return null;
}

export function isRated(rating: number | null): rating is number {
  return rating !== null && Number.isFinite(rating) && rating > 0;
}
