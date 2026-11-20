import { readParam, type SearchParams } from "@/lib/http";

export const REVIEWS_PAGE_SIZE = 20;

export const REVIEW_KINDS = {
  all: "All",
  written: "Reviews",
  ratings: "Ratings",
} as const;

export const REVIEW_SORTS = {
  newest: "Newest",
  oldest: "Oldest",
  rating_desc: "Highest rated",
  rating_asc: "Lowest rated",
  likes_desc: "Most liked",
} as const;

export type ReviewKind = keyof typeof REVIEW_KINDS;
export type ReviewSort = keyof typeof REVIEW_SORTS;

export const KIND_PARAM = "kind";
export const SORT_PARAM = "sort";

export function readReviewKind(query: SearchParams): ReviewKind {
  const value = readParam(query, KIND_PARAM);
  return value in REVIEW_KINDS ? (value as ReviewKind) : "all";
}

export function readReviewSort(query: SearchParams): ReviewSort {
  const value = readParam(query, SORT_PARAM);
  return value in REVIEW_SORTS ? (value as ReviewSort) : "newest";
}

export interface ProfileReview {
  content: string;
  id: string;
  isSpoiler: boolean;
  liked: boolean;
  likesCount: number;
  posterPath: string | null;
  rating: number | null;
  tint: string | null;
  title: string;
  tmdbId: number;
  updatedAt: string;
  year: string | null;
}

export interface ReviewsPage {
  items: ProfileReview[];
  next: number | null;
}

export interface ReviewSummary {
  average: number | null;
  distribution: number[];
  rated: number;
  written: number;
}
