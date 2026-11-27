import type { TitleFilters } from "../filters";

export const LISTS_PAGE_SIZE = 24;
export const LIST_ITEMS_PAGE_SIZE = 40;
export const LIST_COMMENTS_SHOWN = 50;

export const LIST_SORTS = {
  updated: "Recently updated",
  newest: "Newest",
  likes: "Most liked",
  items: "Most titles",
  title: "A–Z",
} as const;

export const ENTRY_SORTS = {
  position: "List order",
  added: "Recently added",
  title: "A–Z",
  release_desc: "Newest release",
  release_asc: "Oldest release",
} as const;

export type ListSort = keyof typeof LIST_SORTS;
export type EntrySort = keyof typeof ENTRY_SORTS;

export interface EntryFilters extends TitleFilters {
  sort: EntrySort;
}

export interface ProfileList {
  description: string;
  id: string;
  isPrivate: boolean;
  isRanked: boolean;
  itemsCount: number;
  likesCount: number;
  previews: (string | null)[];
  reviewsCount: number;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface ListsPage {
  items: ProfileList[];
  next: number | null;
}

export interface ListDetail extends Omit<ProfileList, "previews"> {
  liked: boolean;
  posterPath: string | null;
}

export interface ListEntry {
  place: number;
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: string | null;
}

export interface ListEntriesPage {
  items: ListEntry[];
  next: number | null;
}

export interface ListComment {
  author: {
    avatarUrl: string | null;
    displayName: string;
    id: string;
    username: string;
  };
  content: string;
  createdAt: string;
  id: string;
  liked: boolean;
  likesCount: number;
}
