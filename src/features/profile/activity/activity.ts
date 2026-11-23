import { trimToNull } from "@omerdlw/base-framework/utils";
import { readParam, type SearchParams } from "@/infrastructure/http";

export const ACTIVITY_PAGE_SIZE = 30;

export const ACTIVITY_GROUPS = {
  all: { label: "All", types: [] },
  diary: {
    label: "Diary",
    types: ["WATCH_DIARY_LOGGED", "WATCH_DIARY_REWATCHED"],
  },
  watched: {
    label: "Watched",
    types: ["WATCHED_ADDED"],
  },
  reviews: {
    label: "Reviews",
    types: ["REVIEW_PUBLISHED", "RATING_LOGGED", "REVIEW_LIKED"],
  },
  likes: { label: "Likes", types: ["LIKED_ADDED"] },
  watchlist: { label: "Watchlist", types: ["WATCHLIST_ADDED"] },
  lists: {
    label: "Lists",
    types: ["LIST_CREATED", "LIST_LIKED", "LIST_COMMENTED"],
  },
} as const satisfies Record<
  string,
  { label: string; types: readonly string[] }
>;

export type ActivityGroup = keyof typeof ACTIVITY_GROUPS;

export const ACTIVITY_PARAM = "type";

export function readActivityGroup(query: SearchParams): ActivityGroup {
  const value = readParam(query, ACTIVITY_PARAM);
  return value in ACTIVITY_GROUPS ? (value as ActivityGroup) : "all";
}

export interface ActivityItem {
  createdAt: string;
  edited: boolean;
  id: string;
  list: { slug: string; title: string } | null;
  listOwner: string | null;
  posterPath: string | null;
  rating: number | null;
  target: { displayName: string; username: string } | null;
  title: string | null;
  tmdbId: number | null;
  type: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  next: number | null;
}

export interface ActivityRow {
  created_at: string;
  id: string;
  list: {
    id: string;
    owner: string | null;
    slug: string;
    title: string;
  } | null;
  payload: unknown;
  target: { display_name: string | null; id: string; username: string } | null;
  tmdb_id: number | null;
  type: string;
}

const text = (value: unknown): string | null =>
  typeof value === "string" ? trimToNull(value) : null;

const integer = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

export function toActivityItem(
  row: ActivityRow,
  accountUsername: string,
): ActivityItem {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const slug = row.list?.slug ?? text(payload.slug);
  const listTitle = row.list?.title ?? text(payload.title);
  const commentOnList = row.type === "REVIEW_LIKED" && !row.tmdb_id;

  return {
    createdAt: row.created_at,
    edited: payload.edited === true,
    id: row.id,
    list:
      slug || commentOnList
        ? { slug: slug ?? "", title: listTitle ?? "a list" }
        : null,
    listOwner: slug
      ? (row.list?.owner ??
        (row.type === "LIST_CREATED"
          ? accountUsername
          : commentOnList
            ? null
            : (row.target?.username ?? null)))
      : null,
    posterPath: text(payload.poster_path),
    rating: integer(payload.rating) ?? null,
    target: row.target
      ? {
          displayName: row.target.display_name || row.target.username,
          username: row.target.username,
        }
      : null,
    title: slug || commentOnList ? null : text(payload.title),
    tmdbId: row.tmdb_id,
    type: row.type,
  };
}
