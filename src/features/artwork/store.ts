import { isTmdbImagePath } from "@/infrastructure/tmdb/shared";

export type ArtworkSlot = "poster" | "backdrop";

export function artworkAttributes(slot: ArtworkSlot, path: string | null) {
  return path
    ? { "data-artwork": slot, "data-artwork-path": path }
    : ({} as Record<string, never>);
}

export type ArtworkKind = "movie" | "person";

interface ArtworkEntry {
  backdrop?: string;
  poster?: string;
  updatedAt: number;
}

type ArtworkEntries = Readonly<Record<string, ArtworkEntry>>;

interface ArtworkStore {
  clear(kind: ArtworkKind, id: number, slot?: ArtworkSlot): void;
  getSnapshot(): ArtworkEntries;
  set(kind: ArtworkKind, id: number, slot: ArtworkSlot, path: string): void;
  subscribe(listener: () => void): () => void;
}

const ARTWORK_STORAGE_KEY = "GUFFIN_ARTWORK";

const ARTWORK_MAX_ENTRIES = 200;

const ARTWORK_SLOTS: readonly ArtworkSlot[] = ["poster", "backdrop"];

const EMPTY_ARTWORK: ArtworkEntries = Object.freeze({});

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

function parseArtwork(raw: string | null): ArtworkEntries {
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

function withArtwork(
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

function withoutArtwork(
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

function attempt<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}

function createArtworkStore(): ArtworkStore {
  const listeners = new Set<() => void>();
  let rawValue: string | null | undefined;
  let entries: ArtworkEntries = EMPTY_ARTWORK;

  const getStorage = () =>
    typeof window === "undefined" ? null : window.localStorage;

  const read = (): ArtworkEntries => {
    const stored = attempt(
      () => getStorage()?.getItem(ARTWORK_STORAGE_KEY) ?? null,
      null,
    );
    if (stored !== rawValue) {
      rawValue = stored;
      entries = parseArtwork(stored);
    }
    return entries;
  };

  const write = (next: ArtworkEntries) => {
    if (next === entries) return;
    attempt(() => {
      const storage = getStorage();
      if (!storage) return;
      if (Object.keys(next).length === 0) {
        storage.removeItem(ARTWORK_STORAGE_KEY);
      } else {
        storage.setItem(ARTWORK_STORAGE_KEY, JSON.stringify(next));
      }
    }, undefined);
    rawValue = undefined;
    read();
    listeners.forEach((listener) => listener());
  };

  return {
    clear: (kind, id, slot) => write(withoutArtwork(read(), kind, id, slot)),
    getSnapshot: read,
    set: (kind, id, slot, path) =>
      write(withArtwork(read(), kind, id, slot, path, Date.now())),
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === ARTWORK_STORAGE_KEY) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export const artworkStore = createArtworkStore();
