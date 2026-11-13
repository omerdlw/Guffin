import type { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MediaType } from "@/lib/tmdb/shared";

export interface MovieListSummary {
  description?: string | null;
  id: string;
  isPrivate: boolean;
  itemsCount: number;
  posterPath: string | null;
  previewPosters?: (string | null)[];
  title: string;
}

export interface ListDraft {
  description: string;
  isPrivate: boolean;
  isRanked: boolean;
  title: string;
}

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

export interface ListOrderItem {
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: string | null;
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
  mediaType?: MediaType;
  username: string;
}

export const LIST_TITLE_MAX = 120;

export const LIST_DESCRIPTION_MAX = 2000;

export function previewPosters(list: MovieListSummary): string[] {
  const posters = list.previewPosters?.length
    ? list.previewPosters
    : list.posterPath
      ? [list.posterPath]
      : [];
  return posters.filter((poster): poster is string => Boolean(poster));
}
