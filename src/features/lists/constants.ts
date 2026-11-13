import {
  SURFACE_TILE_END,
  tileVariants,
} from "@/design/components/surface-classes";
import { cn } from "@/design/ui";

export const LIST_TITLE_MAX = 120;

export const LIST_DESCRIPTION_MAX = 2000;

export const LIST_COLUMNS =
  "id, title, description, is_private, items_count, poster_path";

export const MAX_LISTS = 200;

export const PREVIEW_BATCH = 50;

export const PREVIEW_POSTERS = 4;

export const LIST_RATE_LIMIT_PER_MINUTE = 60;

export const LIST_ITEMS_MAX = 2000;

export const PREVIEW_STACK = 3;

export const PREVIEW_PEEK = 6;

export const PREVIEW_STEP = 8;

export const PREVIEW_STACK_WIDTH = 40 + PREVIEW_PEEK * (PREVIEW_STACK - 1);

export const POPULAR_LISTS_SHOWN = 3;

export const POPULAR_PREVIEW_POSTERS = 5;

export const COMPACT_COUNT_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

export const LIST_TILE_CLASS = cn(
  tileVariants(),
  SURFACE_TILE_END,
  "group relative isolate select-none",
);
