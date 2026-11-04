import {
  MOVIE_REVIEW_FILTERS,
  MOVIE_REVIEW_SORTS,
  REVIEW_MAX_LENGTH,
  REVIEW_MIN_LENGTH,
} from "./constants";
import type { MovieReviewFilter, MovieReviewSort, ReviewInput } from "./types";

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

export function normalizeReviewInput(input: ReviewInput): ReviewInput {
  const content =
    typeof input?.content === "string" ? input.content.trim() : "";
  return {
    content,
    isSpoiler: Boolean(input?.isSpoiler) && content.length > 0,
    rating: typeof input?.rating === "number" ? input.rating : null,
  };
}

export function editorSubmitLabel({
  editing,
  isList,
  ratingOnly,
}: {
  editing: boolean;
  isList: boolean;
  ratingOnly: boolean;
}): string {
  if (isList) return editing ? "Update Comment" : "Publish Comment";
  if (editing) return ratingOnly ? "Update Rating" : "Update Review";
  return ratingOnly ? "Save Rating" : "Publish Review";
}

export function starFillWidth(star: number, value: number | null): number {
  if (value === null) return 0;
  if (value >= star) return 24;
  if (value >= star - 0.5) return 12;
  return 0;
}

export function isRated(rating: number | null): rating is number {
  return rating !== null && Number.isFinite(rating) && rating > 0;
}
