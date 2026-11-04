import {
  type NavigationTrip,
  pathOf,
} from "@omerdlw/base-framework/modules/navigation";
import { readParam, type SearchParams } from "@/lib/http";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  ACTIVITY_GROUPS,
  CALENDAR_MONTH_FORMAT,
  DAY_MS,
  ACTIVITY_SORTS,
  DEFAULT_DISPLAY_NAME,
  DIARY_DAY_FORMAT,
  FILTER_DECADES,
  FILTER_GENRES,
  JOIN_DATE_FORMATTER,
  LIST_ITEM_SORTS,
  LIST_SORTS,
  MEDIA_SORTS,
  POSTER_SIZES,
  REVIEW_KINDS,
  REVIEW_SORTS,
} from "./constants";
import type { ListFormData } from "@/features/lists/types";
import type {
  AccountData,
  ActivityDays,
  ActivityFilters,
  CalendarDay,
  ActivityItem,
  ActivityRow,
  Filterable,
  FilterOption,
  ListCardData,
  ListItemFilters,
  ListRow,
  ListSort,
  MediaFilters,
  MediaItem,
  MovieRow,
  Paged,
  ReviewCardData,
  ReviewFilters,
  ReviewRow,
} from "./types";

function pickOption<T extends string>(
  value: string,
  options: readonly FilterOption<T>[],
  fallback: T,
): T {
  return options.find((option) => option.value === value)?.value ?? fallback;
}

export function readPageParam(params: SearchParams | undefined): number {
  const page = Number.parseInt(readParam(params, "page"), 10);
  return Number.isInteger(page) && page > 0 && page <= 10_000 ? page : 1;
}

function readQueryParam(params: SearchParams | undefined): string {
  return readParam(params, "q").slice(0, 80);
}

export function likePattern(query: string): string {
  return `%${query
    .replace(/[\\%_,()*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()}%`;
}

export function pageRange(page: number, size: number) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

function readGenre(params: SearchParams | undefined): number | null {
  const id = Number(readParam(params, "genre"));
  return FILTER_GENRES.some((genre) => genre.id === id) ? id : null;
}

function readDecade(params: SearchParams | undefined): number | null {
  const decade = Number(readParam(params, "decade"));
  return FILTER_DECADES.includes(decade) ? decade : null;
}

export function parseMediaFilters(
  params: SearchParams | undefined,
): MediaFilters {
  return {
    decade: readDecade(params),
    genre: readGenre(params),
    page: readPageParam(params),
    query: readQueryParam(params),
    sort: pickOption(readParam(params, "sort"), MEDIA_SORTS, "added_desc"),
  };
}

export function parseListItemFilters(
  params: SearchParams | undefined,
): ListItemFilters {
  return {
    decade: readDecade(params),
    genre: readGenre(params),
    page: readPageParam(params),
    query: readQueryParam(params),
    sort: pickOption(readParam(params, "sort"), LIST_ITEM_SORTS, "position"),
  };
}

export const hasMediaFilters = (
  filters: Pick<MediaFilters, "decade" | "genre" | "query">,
) => Boolean(filters.query || filters.genre || filters.decade);

export function parseListSort(params: SearchParams | undefined): ListSort {
  return pickOption(readParam(params, "sort"), LIST_SORTS, "updated_desc");
}

export function parseReviewFilters(
  params: SearchParams | undefined,
): ReviewFilters {
  return {
    kind: pickOption(readParam(params, "kind"), REVIEW_KINDS, "all"),
    page: readPageParam(params),
    query: readQueryParam(params),
    sort: pickOption(readParam(params, "sort"), REVIEW_SORTS, "newest"),
  };
}

export function parseActivityFilters(
  params: SearchParams | undefined,
): ActivityFilters {
  return {
    group: pickOption(readParam(params, "type"), ACTIVITY_GROUPS, "all"),
    page: readPageParam(params),
    sort: pickOption(readParam(params, "sort"), ACTIVITY_SORTS, "newest"),
  };
}

export function readMonth(params: SearchParams | undefined): string | null {
  const value = readParam(params, "month");
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? value : null;
}

export function shiftMonth(month: string, offset: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, index - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export function monthBounds(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}

export function posterImage(path: string | null, sizes = POSTER_SIZES) {
  return {
    sizes,
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342"]) ?? undefined,
  };
}

function activityLevelResolver(
  counts: readonly number[],
): (count: number) => number {
  const active = counts.filter(Boolean).sort((a, b) => a - b);
  const at = (share: number) =>
    active[Math.floor(share * (active.length - 1))] ?? 0;
  const steps = [at(0.25), at(0.5), at(0.75)];
  return (count) =>
    count === 0 ? 0 : 1 + steps.filter((step) => count > step).length;
}

export const starsLabel = (value: number) =>
  `${"★".repeat(Math.floor(value))}${value % 1 ? "½" : ""}`;

export function pageWindow(page: number, count: number): (number | "gap")[] {
  const wanted = new Set([1, count, page - 1, page, page + 1]);
  const pages = [...wanted]
    .filter((value) => value >= 1 && value <= count)
    .sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && value - previous > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

export function dayOf(value: string) {
  const parts = DIARY_DAY_FORMAT.formatToParts(new Date(`${value}T00:00:00Z`));
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

export function formatJoinDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : JOIN_DATE_FORMATTER.format(date);
}

export function resolveAccountBackdropUrl(
  profile?: AccountData | null,
): string | null {
  const background = profile?.backgroundUrl?.trim() ?? "";
  if (!background) return null;
  return /^(https?:\/\/|\/|data:image\/)/.test(background) ? background : null;
}

export const leavesAccount = (base?: string) => (trip: NavigationTrip) => {
  if (!base) return pathOf(trip.to) !== pathOf(trip.from);
  const to = pathOf(trip.to).replace(/\/+$/, "") || "/";
  return to !== base && !to.startsWith(`${base}/`);
};

export function getAccountDisplayName(account?: AccountData | null): string {
  return account?.displayName || account?.username || DEFAULT_DISPLAY_NAME;
}

export function releaseYear(value: string | null | undefined): number | null {
  const year = Number(value?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

export const paged = <T>(
  items: T[],
  total: number | null,
  page: number,
  size: number,
): Paged<T> => ({
  items,
  page,
  pageCount: pageCount(total ?? 0, size),
  total: total ?? 0,
});

export function filterMovies<T extends Filterable<T>>(
  query: T,
  filters: Pick<MediaFilters, "decade" | "genre" | "query">,
): T {
  let next = query;
  if (filters.query) next = next.ilike("title", likePattern(filters.query));
  if (filters.genre) {
    next = next.contains("payload", { genre_ids: [filters.genre] });
  }
  if (filters.decade) {
    next = next
      .gte("release_date", `${filters.decade}-01-01`)
      .lt("release_date", `${filters.decade + 10}-01-01`);
  }
  return next;
}

export const toMediaItem = (row: MovieRow, pinned: Set<number>): MediaItem => ({
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

export const reviewCards = (rows: (ReviewRow & { liked: boolean })[]) => {
  const liked = new Set(rows.filter((row) => row.liked).map((row) => row.id));
  return rows.flatMap((row) => toReviewCard(row, liked));
};

export function followButtonOf(
  status: string | null,
  pending: boolean,
  username: string,
): { icon: string; tooltip: string } {
  if (pending) {
    return { icon: "svg-spinners:90-ring-with-bg", tooltip: "Updating..." };
  }
  if (status === "accepted") {
    return { icon: "solar:user-cross-bold", tooltip: `Unfollow @${username}` };
  }
  if (status === "pending") {
    return { icon: "solar:user-cross-bold", tooltip: "Cancel follow request" };
  }
  return { icon: "solar:user-plus-bold", tooltip: `Follow @${username}` };
}

export const toListFormEntry = (
  list: Pick<
    ListCardData,
    | "description"
    | "id"
    | "isPrivate"
    | "isRanked"
    | "itemsCount"
    | "slug"
    | "title"
  >,
): NonNullable<ListFormData["list"]> => ({
  description: list.description,
  id: list.id,
  isPrivate: list.isPrivate,
  isRanked: list.isRanked,
  itemsCount: list.itemsCount,
  slug: list.slug,
  title: list.title,
});

export function buildCalendar(days: ActivityDays) {
  const level = activityLevelResolver(days.counts);
  const from = Date.parse(`${days.from}T00:00:00Z`);
  const weeks: { days: (CalendarDay | null)[]; month: string | null }[] = [];

  days.counts.forEach((count, index) => {
    if (index % 7 === 0) weeks.push({ days: [], month: null });
    const week = weeks[weeks.length - 1];
    const date = new Date(from + index * DAY_MS);
    if (date.getUTCDate() === 1) {
      week.month = CALENDAR_MONTH_FORMAT.format(date);
    }
    week.days.push({ count, date, level: level(count) });
  });

  const last = weeks[weeks.length - 1];
  while (last && last.days.length < 7) last.days.push(null);

  return {
    total: days.counts.reduce((sum, count) => sum + count, 0),
    weeks,
  };
}
