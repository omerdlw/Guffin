import type { SupabaseClient } from "@supabase/supabase-js";
import { TONE } from "@/design/foundations/tones";
import type { PublicAccount } from "@/features/account/account";
import type { SearchParams } from "@/lib/http";
import type { Database } from "@/lib/supabase/database.types";
import {
  type MediaType,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";

export interface Paged<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export interface MediaItem {
  mediaType?: MediaType;
  pinned: boolean;
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: number | null;
}

export interface ListCardData {
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

export interface ReviewCardData {
  backdropPath: string | null;
  content: string;
  createdAt: string;
  id: string;
  isSpoiler: boolean;
  liked: boolean;
  likesCount: number;
  mediaType?: MediaType;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  updatedAt: string;
  year: number | null;
}

export interface ActivityDays {
  counts: number[];
  from: string;
}

export interface ActivitySummary {
  days: ActivityDays;
  month: number;
  week: number;
  year: number;
}

export interface ActivityItem {
  createdAt: string;
  id: string;
  list: { slug: string; title: string } | null;
  listOwner: string | null;
  episodes?: { count: number; episode?: number; season?: number };
  mediaType: MediaType;
  posterPath: string | null;
  rating: number | null;
  target: { displayName: string; username: string } | null;
  title: string | null;
  tmdbId: number | null;
  type: string;
}

export interface DiaryRow {
  hasReview: boolean;
  id: string;
  isRewatch: boolean;
  mediaType: MediaType;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  watchedOn: string;
  year: number | null;
}

export interface DiaryEntry {
  id: string;
  title: string;
  tmdbId: number;
  watchedOn: string;
}

export interface PersonPreview {
  avatarUrl: string | null;
  displayName: string;
  username: string;
}

export interface ListDetail {
  description: string;
  id: string;
  isPrivate: boolean;
  isRanked: boolean;
  itemsCount: number;
  liked: boolean;
  likesCount: number;
  mediaType: MediaType;
  owner: { displayName: string; id: string; username: string };
  posterPath: string | null;
  reviewsCount: number;
  slug: string;
  title: string;
  updatedAt: string;
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

export interface AccountViewProps {
  query: SearchParams;
  username: string;
}

interface FilterOption<T extends string = string> {
  label: string;
  value: T;
}

type MediaSort = (typeof MEDIA_SORTS)[number]["value"];

type ListItemSort = (typeof LIST_ITEM_SORTS)[number]["value"];

export interface MediaFilters {
  decade: number | null;
  genre: number | null;
  page: number;
  query: string;
  sort: MediaSort;
}

export interface ListItemFilters extends Omit<MediaFilters, "sort"> {
  sort: ListItemSort;
}

export type ListSort = (typeof LIST_SORTS)[number]["value"];

type ReviewSort = (typeof REVIEW_SORTS)[number]["value"];

type ReviewKind = (typeof REVIEW_KINDS)[number]["value"];

export interface ReviewFilters {
  kind: ReviewKind;
  page: number;
  query: string;
  sort: ReviewSort;
}

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number]["value"];

type ActivitySort = (typeof ACTIVITY_SORTS)[number]["value"];

export interface ActivityFilters {
  group: ActivityGroup;
  page: number;
  sort: ActivitySort;
}

export type TileSource =
  | { kind: "likes" | "watched" | "watchlist"; mediaType?: MediaType }
  | { kind: "list"; listId: string; mediaType?: MediaType };

export type AccountData = PublicAccount;

export type ProfileClient = SupabaseClient<Database>;

export type LibraryCounts = Record<
  "diary" | "likes" | "lists" | "reviews" | "watched" | "watchlist",
  number
>;

export type MediaKind = "likes" | "watched" | "watchlist";

export interface MovieRow {
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
}

export interface ListRow {
  description: string;
  id: string;
  media_type?: string;
  is_private: boolean;
  is_ranked: boolean;
  items_count: number;
  likes_count: number;
  reviews_count: number;
  slug: string;
  title: string;
  updated_at: string;
}

export interface ListPageData {
  commentCount: number;
  comments: ListComment[];
  items: Paged<MediaItem>;
  list: ListDetail;
  ownComment: string | null;
}

export interface ReviewRow {
  backdrop_path: string | null;
  content: string;
  created_at: string;
  id: string;
  is_spoiler: boolean;
  likes_count: number;
  media_type?: string;
  poster_path: string | null;
  rating: number | null;
  release_date: string | null;
  title: string | null;
  tmdb_id: number | null;
  updated_at: string;
}

export interface ActivityRow {
  created_at: string;
  id: string;
  media_type?: string | null;
  payload: Record<string, unknown> | null;
  target: { display_name: string | null; username: string } | null;
  tmdb_id: number | null;
  type: string;
}

export interface AccountOverviewData {
  activity: ActivityItem[];
  activityDays: ActivityDays;
  counts: LibraryCounts;
  diary: DiaryEntry[];
  favorites: MediaItem[];
  following: PersonPreview[];
  followingCount: number;
  lists: ListCardData[];
  popular: ReviewCardData[];
  reviews: ReviewCardData[];
  spread: number[];
  watched: MediaItem[];
  watchlist: MediaItem[];
}

export const FAVORITES_MAX = 5;

export const MEDIA_PAGE_SIZE = 36;

export const MEDIA_SORTS = [
  { label: "Recently added", value: "added_desc" },
  { label: "Added first", value: "added_asc" },
  { label: "Newest release", value: "release_desc" },
  { label: "Oldest release", value: "release_asc" },
  { label: "Title A–Z", value: "title_asc" },
  { label: "Title Z–A", value: "title_desc" },
] as const satisfies readonly FilterOption[];

export const LIST_ITEM_SORTS = [
  { label: "List order", value: "position" },
  ...MEDIA_SORTS,
] as const satisfies readonly FilterOption[];

export const FILTER_GENRES: readonly { id: number; label: string }[] = [
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14, label: "Fantasy" },
  { id: 36, label: "History" },
  { id: 27, label: "Horror" },
  { id: 10402, label: "Music" },
  { id: 9648, label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Science Fiction" },
  { id: 53, label: "Thriller" },
  { id: 10752, label: "War" },
  { id: 37, label: "Western" },
];

export const FILTER_DECADES: readonly number[] = Array.from(
  { length: 11 },
  (_, index) => 2020 - index * 10,
);

export const MEDIA_FILTERS = [
  {
    allLabel: "Any genre",
    key: "genre",
    options: FILTER_GENRES.map((genre) => ({
      label: genre.label,
      value: String(genre.id),
    })),
  },
  {
    allLabel: "Any decade",
    key: "decade",
    options: FILTER_DECADES.map((decade) => ({
      label: `${decade}s`,
      value: String(decade),
    })),
  },
];

export const LIST_SORTS = [
  { label: "Recently updated", value: "updated_desc" },
  { label: "Newest", value: "created_desc" },
  { label: "Oldest", value: "created_asc" },
  { label: "Most films", value: "items_desc" },
  { label: "Most liked", value: "likes_desc" },
  { label: "Title A–Z", value: "title_asc" },
] as const satisfies readonly FilterOption[];

export const REVIEW_SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest rated", value: "rating_desc" },
  { label: "Lowest rated", value: "rating_asc" },
  { label: "Most liked", value: "likes_desc" },
] as const satisfies readonly FilterOption[];

export const REVIEW_KINDS = [
  { label: "Reviews and ratings", value: "all" },
  { label: "Written reviews", value: "written" },
  { label: "Ratings only", value: "ratings" },
] as const satisfies readonly FilterOption[];

export const ACTIVITY_GROUPS = [
  { label: "Everything", value: "all" },
  { label: "Diary", value: "diary" },
  { label: "Watched", value: "watched" },
  { label: "Watchlist", value: "watchlist" },
  { label: "Likes", value: "likes" },
  { label: "Reviews and ratings", value: "reviews" },
  { label: "Lists", value: "lists" },
  { label: "Follows", value: "follows" },
] as const satisfies readonly FilterOption[];

export const ACTIVITY_SORTS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
] as const satisfies readonly FilterOption[];

export const PROFILE_GRID =
  "grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6";

export const PROFILE_ROW =
  "grid-cols-5 gap-fib-2 sm:grid-cols-5 sm:gap-fib-3 md:grid-cols-5 lg:grid-cols-5";

const POSTER_SIZES = "(min-width: 1024px) 16vw, (min-width: 640px) 22vw, 30vw";

export const DAY_MS = 86_400_000;

export const CALENDAR_CELL = "size-2.5 rounded-mark";

export const STRONG_CLASS =
  "font-medium text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current";

export const STAT_LABEL_CLASS = `${TONE.label} text-ink-body`;

export const DIARY_LAYOUT =
  "grid w-full gap-fib-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]";

export const DIARY_CALENDAR_GRID = "grid grid-cols-7 gap-1.5";

export const DIARY_DAY_COLUMNS =
  "grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-fib-4";

export const PROFILE_CONTAINER_CLASS =
  "mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8";

export function pickOption<T extends string>(
  value: string,
  options: readonly FilterOption<T>[],
  fallback: T,
): T {
  return options.find((option) => option.value === value)?.value ?? fallback;
}

export function likePattern(query: string): string {
  return `%${query
    .replace(/[\\%_,()*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()}%`;
}

export const hasMediaFilters = (
  filters: Pick<MediaFilters, "decade" | "genre" | "query">,
) => Boolean(filters.query || filters.genre || filters.decade);

export function shiftMonth(month: string, offset: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, index - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export function posterImage(path: string | null, sizes = POSTER_SIZES) {
  return {
    sizes,
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342"]) ?? undefined,
  };
}

export function releaseYear(value: string | null | undefined): number | null {
  const year = Number(value?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

export const toMediaItem = (
  row: MovieRow,
  pinned: Set<number>,
  mediaType: MediaType = "movie",
): MediaItem => ({
  mediaType,
  pinned: pinned.has(row.tmdb_id),
  posterPath: row.poster_path,
  title: row.title,
  tmdbId: row.tmdb_id,
  year: releaseYear(row.release_date),
});

export const toListCard = (
  row: ListRow,
  previews: (string | null)[],
): ListCardData => ({
  description: row.description,
  id: row.id,
  isPrivate: row.is_private,
  isRanked: row.is_ranked,
  itemsCount: row.items_count,
  likesCount: row.likes_count,
  previews,
  reviewsCount: row.reviews_count,
  slug: row.slug,
  title: row.title,
  updatedAt: row.updated_at,
});

export const toReviewCard = (
  row: ReviewRow,
  liked: Set<string>,
): ReviewCardData[] =>
  row.tmdb_id === null
    ? []
    : [
        {
          backdropPath: row.backdrop_path,
          content: row.content,
          createdAt: row.created_at,
          id: row.id,
          isSpoiler: row.is_spoiler,
          liked: liked.has(row.id),
          likesCount: row.likes_count,
          mediaType: row.media_type === "tv" ? "tv" : "movie",
          posterPath: row.poster_path,
          rating: row.rating === null ? null : Number(row.rating),
          title: row.title ?? "Untitled",
          tmdbId: row.tmdb_id,
          updatedAt: row.updated_at,
          year: releaseYear(row.release_date),
        },
      ];

const textOrNull = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

export function toActivityItem(
  row: ActivityRow,
  accountUsername: string,
): ActivityItem {
  const payload = row.payload ?? {};
  const slug = textOrNull(payload.slug);
  const isOwnList = row.type === "LIST_CREATED";

  return {
    createdAt: row.created_at,
    id: row.id,
    list: slug ? { slug, title: textOrNull(payload.title) ?? "a list" } : null,
    listOwner: slug
      ? isOwnList
        ? accountUsername
        : (row.target?.username ?? null)
      : null,
    ...(typeof payload.count === "number"
      ? {
          episodes: {
            count: payload.count,
            ...(typeof payload.episode_number === "number" && {
              episode: payload.episode_number,
            }),
            ...(typeof payload.season_number === "number" && {
              season: payload.season_number,
            }),
          },
        }
      : {}),
    mediaType: row.media_type === "tv" ? "tv" : "movie",
    posterPath: textOrNull(payload.poster_path),
    rating: typeof payload.rating === "number" ? payload.rating : null,
    target: row.target
      ? {
          displayName: row.target.display_name || row.target.username,
          username: row.target.username,
        }
      : null,
    title: slug ? null : textOrNull(payload.title),
    tmdbId: row.tmdb_id,
    type: row.type,
  };
}
