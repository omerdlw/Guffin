import { toUserMessage } from "@omerdlw/base-framework/utils";
import type { CSSProperties } from "react";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
  PREVIEW_PEEK,
  PREVIEW_STACK,
  PREVIEW_STEP,
} from "./constants";
import type {
  ListInput,
  ListRecord,
  MovieListSummary,
  PopularList,
  PopularListRow,
} from "./types";

export const toListSummary = (
  row: ListRecord,
  previewPosters?: (string | null)[],
): MovieListSummary => ({
  description: row.description,
  id: row.id,
  isPrivate: row.is_private,
  itemsCount: row.items_count,
  posterPath: row.poster_path,
  previewPosters: previewPosters ?? (row.poster_path ? [row.poster_path] : []),
  title: row.title,
});

export function listErrorMessage(error: unknown, fallback: string) {
  if ((error as { code?: string } | null)?.code === "54000") {
    return "That list is full";
  }
  return toUserMessage(error, { fallback });
}

export function sanitizeListInput(input: ListInput): ListInput | null {
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const description =
    typeof input?.description === "string" ? input.description.trim() : "";
  if (!title || title.length > LIST_TITLE_MAX) return null;
  if (description.length > LIST_DESCRIPTION_MAX) return null;
  return {
    description,
    isPrivate: Boolean(input.isPrivate),
    isRanked: Boolean(input.isRanked),
    title,
  };
}

export function previewPosters(list: MovieListSummary): string[] {
  const posters = list.previewPosters?.length
    ? list.previewPosters
    : list.posterPath
      ? [list.posterPath]
      : [];
  return posters.filter((poster): poster is string => Boolean(poster));
}

export function stackCard(index: number): CSSProperties {
  const height = 60 - index * PREVIEW_STEP;
  return {
    height: `${height}px`,
    left: `${index * PREVIEW_PEEK}px`,
    top: `${(60 - height) / 2}px`,
    width: "40px",
    zIndex: PREVIEW_STACK - index,
  };
}

export function toPopularList(
  row: PopularListRow,
  previews: (string | null)[],
): PopularList {
  return {
    description: row.description ?? "",
    id: row.id,
    itemsCount: row.items_count,
    likesCount: row.likes_count,
    owner: {
      avatarUrl: row.owner?.avatar_url ?? null,
      displayName: row.owner?.display_name || row.owner?.username || "",
      username: row.owner?.username ?? "",
    },
    previews,
    reviewsCount: row.reviews_count,
    slug: row.slug,
    title: row.title,
  };
}

export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function orderKeyTarget(
  key: string,
  index: number,
  total: number,
): number | null {
  switch (key) {
    case "ArrowUp":
      return index - 1;
    case "ArrowDown":
      return index + 1;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}
