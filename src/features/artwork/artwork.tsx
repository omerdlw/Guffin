"use client";

import { Suspense, useMemo, useSyncExternalStore } from "react";
import {
  type ContextMenuContextValue,
  useContextMenu,
} from "@omerdlw/base-framework/context-menu";
import { useNavigationIntent } from "@omerdlw/base-framework/navigation";
import { report } from "@omerdlw/base-framework/utils";
import { AwardFoil } from "@/features/detail/awards";
import { type Awards, isTmdbImagePath, tmdbImageUrl } from "@/lib/tmdb/shared";
import { StagePart } from "@/motion/react";
import { readable } from "@/motion/render";
import { Tilt } from "@/motion/tilt";
import { Icon } from "@/design/components/icon";
import { Image } from "@/design/components/image";
import {
  ARTWORK_MENU_LABELS,
  ARTWORK_PAGE_PATTERN,
  ARTWORK_STORAGE_KEY,
  ARTWORK_TARGET_SELECTOR,
  EMPTY_ARTWORK,
  PRELOADED_BACKDROP_LIMIT,
} from "./constants";
import type {
  ArtworkContextMenuOptions,
  ArtworkEntries,
  ArtworkKind,
  ArtworkSlot,
  ArtworkStore,
  MenuPayload,
} from "./types";
import {
  artworkAttributes,
  artworkKey,
  attempt,
  parseArtwork,
  resolveArtwork,
  withArtwork,
  withoutArtwork,
} from "./utils";

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

const artworkStore = createArtworkStore();

export function useArtworkPath(
  kind: ArtworkKind,
  id: number,
  slot: ArtworkSlot,
  fallback: string | null,
): string | null {
  const chosen = useSyncExternalStore(
    artworkStore.subscribe,
    () => artworkStore.getSnapshot()[artworkKey(kind, id)]?.[slot] ?? null,
    () => null,
  );
  return chosen ?? fallback;
}

export function useArtworkContextMenu({
  defaults,
  id,
  kind,
}: ArtworkContextMenuOptions): void {
  const { backdrop: defaultBackdrop, poster: defaultPoster } = defaults;

  const config = useMemo(
    () => ({
      id: `artwork:${kind}:${id}`,
      items: ({ payload }: ContextMenuContextValue) => {
        if (!payload) return [];
        const { path, slot } = payload as MenuPayload;
        const fallback = slot === "poster" ? defaultPoster : defaultBackdrop;
        const entries = artworkStore.getSnapshot();
        const showing = resolveArtwork(entries, kind, id, slot, fallback);
        const labels = ARTWORK_MENU_LABELS[slot];

        return [
          {
            hidden: path === showing,
            icon: labels.icon,
            key: `set-${slot}`,
            label: labels.set,
            onSelect: () => artworkStore.set(kind, id, slot, path),
          },
          {
            hidden: entries[artworkKey(kind, id)]?.[slot] === undefined,
            icon: "solar:restart-bold",
            key: `restore-${slot}`,
            label: labels.restore,
            onSelect: () => artworkStore.clear(kind, id, slot),
          },
        ];
      },
      priority: 10,
      resolvePayload: (event: MouseEvent): MenuPayload | null => {
        const element = (event.target as Element | null)?.closest<HTMLElement>(
          ARTWORK_TARGET_SELECTOR,
        );
        const slot = element?.dataset.artwork;
        const path = element?.dataset.artworkPath;
        return (slot === "poster" || slot === "backdrop") &&
          isTmdbImagePath(path)
          ? { path, slot }
          : null;
      },
      target: ARTWORK_TARGET_SELECTOR,
    }),
    [defaultBackdrop, defaultPoster, id, kind],
  );

  useContextMenu(config);
}

export function PosterThumb({
  className,
  kind = "movie",
  movieId,
  original = false,
  posterPath,
}: {
  className: string;
  kind?: "movie" | "tv";
  movieId: number | null;
  original?: boolean;
  posterPath: string | null;
}) {
  const path = useArtworkPath(kind, movieId ?? 0, "poster", posterPath);

  return (
    <div
      className={`relative aspect-[2/3] shrink-0 overflow-hidden bg-fill ring-1 ring-edge ring-inset ${className}`}
    >
      <Image
        alt=""
        className="object-cover"
        fallback={
          <div className="center h-full w-full text-ink-faint">
            <Icon icon="solar:clapperboard-play-bold" size={16} />
          </div>
        }
        sizes="80px"
        src={tmdbImageUrl("poster", path, original ? "original" : "w92")}
      />
    </div>
  );
}

export function ArtworkPrint({
  alt,
  awards,
  className = "w-full shrink-0",
  fallbackIcon,
  frameClassName,
  part,
  path,
  src,
}: {
  alt: string;
  awards?: Promise<Awards | null>;
  className?: string;
  fallbackIcon: string;
  frameClassName: string;
  part: string;
  path: string | null;
  src: string | null;
}) {
  return (
    <Tilt
      className={className}
      frameClassName={`overflow-hidden ${frameClassName}`}
    >
      {(light) => (
        <StagePart
          className="absolute inset-0 overflow-hidden rounded-[inherit]"
          name={part}
        >
          <div
            className="absolute inset-0"
            {...artworkAttributes("poster", path)}
          >
            <Image
              alt={alt}
              className="object-cover"
              fallback={
                <div className="center h-full w-full text-ink-faint ring-1 ring-edge ring-inset">
                  <Icon icon={fallbackIcon} size={40} />
                </div>
              }
              fetchPriority="high"
              loading="eager"
              sizes="(min-width: 1280px) 384px, (min-width: 1024px) 320px, 320px"
              src={src}
            />
          </div>
          {awards ? (
            <Suspense fallback={null}>
              <AwardFoil awards={awards} {...light} />
            </Suspense>
          ) : null}
        </StagePart>
      )}
    </Tilt>
  );
}

const preloadedBackdrops = new Map<string, HTMLImageElement>();

function preloadBackdropImage(src: string) {
  if (preloadedBackdrops.has(src)) return;
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = readable(src);
  void image.decode().catch(() => {});
  preloadedBackdrops.set(src, image);
  while (preloadedBackdrops.size > PRELOADED_BACKDROP_LIMIT) {
    preloadedBackdrops.delete(preloadedBackdrops.keys().next().value as string);
  }
}

async function fetchBackdropPath(
  kind: ArtworkKind,
  id: number,
): Promise<string | null> {
  const chosen = artworkStore.getSnapshot()[artworkKey(kind, id)]?.backdrop;
  if (chosen) return chosen;

  const response = await fetch(`/api/backdrop?kind=${kind}&id=${id}`);
  if (!response.ok) return null;
  const { path } = (await response.json()) as { path: unknown };
  return typeof path === "string" ? path : null;
}

async function preloadBackdropFor(pagePath: string) {
  const match = ARTWORK_PAGE_PATTERN.exec(pagePath);
  if (!match) return;
  const path = await fetchBackdropPath(
    match[1] as ArtworkKind,
    Number(match[2]),
  );
  const src = path ? tmdbImageUrl("backdrop", path, "original") : null;
  if (src) preloadBackdropImage(src);
}

export function BackdropPreloader(): null {
  useNavigationIntent((path) => {
    preloadBackdropFor(path).catch((error) =>
      report("BackdropPreloader", error),
    );
  });
  return null;
}
