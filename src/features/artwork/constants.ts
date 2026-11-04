import type { ArtworkEntries, ArtworkSlot } from "./types";

export const ARTWORK_STORAGE_KEY = "GUFFIN_ARTWORK";

export const ARTWORK_MAX_ENTRIES = 200;

export const SLOTS: readonly ArtworkSlot[] = ["poster", "backdrop"];

export const EMPTY_ARTWORK: ArtworkEntries = Object.freeze({});

export const TARGET = "[data-artwork]";

export const LABELS: Record<
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

export const PAGE = /^\/(movie|person)\/([1-9]\d{0,9})$/;

export const KEEP = 6;
