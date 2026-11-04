import type { ArtworkEntries, ArtworkSlot } from "./types";

export const ARTWORK_STORAGE_KEY = "GUFFIN_ARTWORK";

export const ARTWORK_MAX_ENTRIES = 200;

export const ARTWORK_SLOTS: readonly ArtworkSlot[] = ["poster", "backdrop"];

export const EMPTY_ARTWORK: ArtworkEntries = Object.freeze({});

export const ARTWORK_TARGET_SELECTOR = "[data-artwork]";

export const ARTWORK_MENU_LABELS: Record<
  ArtworkSlot,
  { icon: string; restore: string; set: string }
> = {
  backdrop: {
    icon: "solar:gallery-edit-bold",
    restore: "Restore default background",
    set: "Set as background",
  },
  poster: {
    icon: "solar:sidebar-code-bold",
    restore: "Restore default poster",
    set: "Set as poster",
  },
};

export const ARTWORK_PAGE_PATTERN = /^\/(movie|person)\/([1-9]\d{0,9})$/;

export const PRELOADED_BACKDROP_LIMIT = 6;
