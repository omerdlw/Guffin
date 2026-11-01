export interface MovieListSummary {
  description?: string | null;
  id: string;
  isPrivate: boolean;
  itemsCount: number;
  posterPath: string | null;
  previewPosters?: (string | null)[];
  title: string;
}

export type MovieListsResult =
  | { lists: MovieListSummary[]; memberships: string[]; success: true }
  | { error: string; success: false };

export type MovieListChangeResult =
  | { inList: boolean; list: MovieListSummary; success: true }
  | { error: string; success: false };

export const LIST_TITLE_MAX = 120;

export const LIST_DESCRIPTION_MAX = 2000;

export interface ListInput {
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
