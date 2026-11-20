import type { TitleFilters } from "../filters";

export const LIBRARY_PAGE_SIZE = 40;

export type LibraryKind = "likes" | "watched" | "watchlist";

export const LIBRARY_SORTS = {
  added_desc: "Recently added",
  added_asc: "Added first",
  release_desc: "Newest release",
  release_asc: "Oldest release",
  title: "A–Z",
} as const;

export type LibrarySort = keyof typeof LIBRARY_SORTS;

export const WATCHED_SORTS = {
  ...LIBRARY_SORTS,
  added_desc: "Recently watched",
  added_asc: "Watched first",
} as const satisfies Record<LibrarySort, string>;

export interface LibraryFilters extends TitleFilters {
  sort: LibrarySort;
}

export interface LibraryItem {
  pinned: boolean;
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: string | null;
}

export interface LibraryPage {
  items: LibraryItem[];
  next: number | null;
}

export const LIBRARY_COPY: Record<LibraryKind, { empty: string; own: string }> =
  {
    likes: {
      empty: "No liked films yet",
      own: "Films you like show up here. Pin up to five as favorites.",
    },
    watched: {
      empty: "No watched films yet",
      own: "Films you mark as watched show up here",
    },
    watchlist: {
      empty: "The watchlist is empty",
      own: "Films you save for later show up here",
    },
  };
