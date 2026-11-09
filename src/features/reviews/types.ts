import type { MediaType } from "@/features/catalog/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MOVIE_REVIEW_FILTERS, MOVIE_REVIEW_SORTS } from "./constants";

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

export type ReviewEditorData =
  | {
      kind: "movie";
      mediaType?: MediaType;
      movieId: number;
      review: ReviewInput | null;
      onSaved?: (review: ReviewInput) => void;
      title: string;
    }
  | {
      kind: "list";
      listId: string;
      review: Pick<ReviewInput, "content"> | null;
      onSaved?: () => void;
      title: string;
    };

export type ReviewsClient = SupabaseClient<Database>;

export interface ReviewRow {
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
