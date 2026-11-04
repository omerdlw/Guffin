import type { MutationResult } from "@/features/auth/types";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

export interface MovieListSummary {
  description?: string | null;
  id: string;
  isPrivate: boolean;
  itemsCount: number;
  posterPath: string | null;
  previewPosters?: (string | null)[];
  title: string;
}

export type MovieListsResult = MutationResult<{
  lists: MovieListSummary[];
  memberships: string[];
}>;

export type MovieListChangeResult = MutationResult<{
  inList: boolean;
  list: MovieListSummary;
}>;

export interface ListPickerLibrary {
  lists: MovieListSummary[];
  memberships: ReadonlySet<string>;
  status: "error" | "loading" | "ready";
}

export interface ListDraft {
  description: string;
  isPrivate: boolean;
  isRanked: boolean;
  title: string;
}

export type ListInput = ListDraft;

export interface PopularList {
  description: string;
  id: string;
  itemsCount: number;
  likesCount: number;
  owner: { avatarUrl: string | null; displayName: string; username: string };
  previews: (string | null)[];
  reviewsCount: number;
  slug: string;
  title: string;
}

export type ListsClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

export interface ListRecord {
  description: string | null;
  id: string;
  is_private: boolean;
  items_count: number;
  poster_path: string | null;
  title: string;
}

export interface ListOrderItem {
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: string | null;
}

export interface ListOrderState {
  order: ListOrderItem[];
  saved: ListOrderItem[] | null;
  status: "failed" | "loading" | "ready";
}

export interface ListCommentTarget {
  content: string | null;
  listId: string;
  title: string;
}

export interface ListFormData {
  list?: {
    description: string;
    id: string;
    isPrivate: boolean;
    isRanked: boolean;
    itemsCount?: number;
    slug: string;
    title: string;
  };
  username: string;
}

export interface ListOrderData {
  listId: string;
  title: string;
}

export interface ListPickerData {
  movieId: number;
}

export interface PopularListRow {
  description: string | null;
  id: string;
  items_count: number;
  likes_count: number;
  owner: {
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null;
  reviews_count: number;
  slug: string;
  title: string;
}
