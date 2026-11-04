import { toUserMessage } from "@omerdlw/base-framework/utils";
import type { CSSProperties } from "react";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
  PREVIEW_PEEK,
  PREVIEW_STACK,
  PREVIEW_STEP,
} from "./constants";
import type { ListInput, ListRecord, MovieListSummary } from "./types";

export const summarize = (
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

export function messageFor(error: unknown, fallback: string) {
  if ((error as { code?: string } | null)?.code === "54000") {
    return "That list is full";
  }
  return toUserMessage(error, { fallback });
}

export function cleanList(input: ListInput): ListInput | null {
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
