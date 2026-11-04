import { isTmdbImagePath } from "@/lib/tmdb/shared";
import { ARTWORK_MAX_ENTRIES, ARTWORK_SLOTS, EMPTY_ARTWORK } from "./constants";
import type {
  ArtworkEntries,
  ArtworkEntry,
  ArtworkKind,
  ArtworkSlot,
} from "./types";

export function artworkKey(kind: ArtworkKind, id: number): string {
  return `${kind}:${id}`;
}

function isArtworkKey(key: string): boolean {
  return /^(?:movie|person):[1-9]\d{0,9}$/.test(key);
}

function parseEntry(value: unknown): ArtworkEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const entry: ArtworkEntry = {
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : 0,
  };
  for (const slot of ARTWORK_SLOTS) {
    const path = raw[slot];
    if (isTmdbImagePath(path)) entry[slot] = path;
  }
  return entry.poster || entry.backdrop ? entry : null;
}

function pruneEntries(entries: Record<string, ArtworkEntry>): ArtworkEntries {
  return Object.fromEntries(
    Object.entries(entries)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, ARTWORK_MAX_ENTRIES),
  );
}

export function parseArtwork(raw: string | null): ArtworkEntries {
  if (!raw) return EMPTY_ARTWORK;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_ARTWORK;
    const entries: Record<string, ArtworkEntry> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const entry = isArtworkKey(key) ? parseEntry(value) : null;
      if (entry) entries[key] = entry;
    }
    return pruneEntries(entries);
  } catch {
    return EMPTY_ARTWORK;
  }
}

export function withArtwork(
  entries: ArtworkEntries,
  kind: ArtworkKind,
  id: number,
  slot: ArtworkSlot,
  path: string,
  now: number,
): ArtworkEntries {
  if (!isTmdbImagePath(path)) return entries;
  const key = artworkKey(kind, id);
  return pruneEntries({
    ...entries,
    [key]: { ...entries[key], [slot]: path, updatedAt: now },
  });
}

export function withoutArtwork(
  entries: ArtworkEntries,
  kind: ArtworkKind,
  id: number,
  slot?: ArtworkSlot,
): ArtworkEntries {
  const key = artworkKey(kind, id);
  const current = entries[key];
  if (!current || (slot && !current[slot])) return entries;

  const { [key]: _removed, ...rest } = entries;
  if (!slot) return rest;

  const next: ArtworkEntry = { ...current };
  delete next[slot];
  return next.poster || next.backdrop ? { ...rest, [key]: next } : rest;
}

export function resolveArtwork(
  entries: ArtworkEntries,
  kind: ArtworkKind,
  id: number,
  slot: ArtworkSlot,
  fallback: string | null,
): string | null {
  return entries[artworkKey(kind, id)]?.[slot] ?? fallback;
}

export function attempt<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}

export function artworkAttributes(slot: ArtworkSlot, path: string | null) {
  return path
    ? { "data-artwork": slot, "data-artwork-path": path }
    : ({} as Record<string, never>);
}
