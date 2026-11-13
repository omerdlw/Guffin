import { readParam, type SearchParams } from "@/lib/http";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
  type ActivityFilters,
  FILTER_DECADES,
  FILTER_GENRES,
  LIST_ITEM_SORTS,
  type ListItemFilters,
  MEDIA_SORTS,
  type MediaFilters,
  type Paged,
  pickOption,
  REVIEW_KINDS,
  REVIEW_SORTS,
  type ReviewFilters,
} from "./profile";

export function readPageParam(params: SearchParams | undefined): number {
  const page = Number.parseInt(readParam(params, "page"), 10);
  return Number.isInteger(page) && page > 0 && page <= 10_000 ? page : 1;
}

function readQueryParam(params: SearchParams | undefined): string {
  return readParam(params, "q").slice(0, 80);
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
