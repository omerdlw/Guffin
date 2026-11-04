"use client";

import { Suspense, useMemo, useSyncExternalStore } from "react";
import {
  type ContextMenuContextValue,
  useContextMenu,
} from "@omerdlw/base-framework/modules/context-menu";
import { useNavigationIntent } from "@omerdlw/base-framework/modules/navigation";
import { report } from "@omerdlw/base-framework/utils";
import { AwardFoil } from "@/features/detail/awards";
import { type Awards, isTmdbImagePath, tmdbImageUrl } from "@/lib/tmdb/shared";
import { StagePart } from "@/motion/react";
import { readable } from "@/motion/render";
import { Tilt } from "@/motion/tilt";
import { AdaptiveImage, Icon } from "@/ui/media";
import {
  ARTWORK_STORAGE_KEY,
  EMPTY_ARTWORK,
  KEEP,
  LABELS,
  PAGE,
  TARGET,
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
  artworkKey,
  artworkTarget,
  parseArtwork,
  resolveArtwork,
  safely,
  withArtwork,
  withoutArtwork,
} from "./utils";

function createArtworkStore(
  getStorage: () => Storage | null,
  now: () => number = Date.now,
): ArtworkStore {
  const listeners = new Set<() => void>();
  let raw: string | null | undefined;
  let entries: ArtworkEntries = EMPTY_ARTWORK;

  const read = (): ArtworkEntries => {
    const stored = safely(
      () => getStorage()?.getItem(ARTWORK_STORAGE_KEY) ?? null,
      null,
    );
    if (stored !== raw) {
      raw = stored;
      entries = parseArtwork(stored);
    }
    return entries;
  };

  const write = (next: ArtworkEntries) => {
    if (next === entries) return;
    safely(() => {
      const storage = getStorage();
      if (!storage) return;
      if (Object.keys(next).length === 0)
        storage.removeItem(ARTWORK_STORAGE_KEY);
      else storage.setItem(ARTWORK_STORAGE_KEY, JSON.stringify(next));
    }, undefined);
    raw = undefined;
    read();
    listeners.forEach((listener) => listener());
  };

  return {
    clear: (kind, id, slot) => write(withoutArtwork(read(), kind, id, slot)),
    getSnapshot: read,
    set: (kind, id, slot, path) =>
      write(withArtwork(read(), kind, id, slot, path, now())),
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === ARTWORK_STORAGE_KEY) listener();
      };
      if (typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
  };
}

const artworkStore = createArtworkStore(() =>
  typeof window === "undefined" ? null : window.localStorage,
);

const subscribe = artworkStore.subscribe;
const getSnapshot = artworkStore.getSnapshot;

export function useArtworkPath(
  kind: ArtworkKind,
  id: number,
  slot: ArtworkSlot,
  fallback: string | null,
): string | null {
  const chosen = useSyncExternalStore(
    subscribe,
    () => getSnapshot()[artworkKey(kind, id)]?.[slot] ?? null,
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

  const config = useMemo(() => {
    const payloadOf = (context: ContextMenuContextValue) =>
      context.payload as MenuPayload | null | undefined;

    return {
      id: `artwork:${kind}:${id}`,
      target: TARGET,
      priority: 10,
      resolvePayload: (event: MouseEvent): MenuPayload | null => {
        const element = (event.target as Element | null)?.closest<HTMLElement>(
          TARGET,
        );
        const slot = element?.dataset.artwork;
        const path = element?.dataset.artworkPath;
        return (slot === "poster" || slot === "backdrop") &&
          isTmdbImagePath(path)
          ? { path, slot }
          : null;
      },
      items: (context: ContextMenuContextValue) => {
        const payload = payloadOf(context);
        if (!payload) return [];
        const { path, slot } = payload;
        const fallback = slot === "poster" ? defaultPoster : defaultBackdrop;
        const showing = resolveArtwork(getSnapshot(), kind, id, slot, fallback);
        const labels = LABELS[slot];

        return [
          {
            key: `set-${slot}`,
            hidden: path === showing,
            icon: labels.icon,
            label: labels.set,
            onSelect: () => artworkStore.set(kind, id, slot, path),
          },
          {
            key: `restore-${slot}`,
            hidden: getSnapshot()[artworkKey(kind, id)]?.[slot] === undefined,
            icon: "solar:restart-bold",
            label: labels.restore,
            onSelect: () => artworkStore.clear(kind, id, slot),
          },
        ];
      },
    };
  }, [defaultBackdrop, defaultPoster, id, kind]);

  useContextMenu(config);
}

export function PosterThumb({
  className,
  movieId,
  original = false,
  posterPath,
}: {
  className: string;
  movieId: number | null;
  original?: boolean;
  posterPath: string | null;
}) {
  const path = useArtworkPath("movie", movieId ?? 0, "poster", posterPath);

  return (
    <div
      className={`relative aspect-[2/3] shrink-0 overflow-hidden bg-fill ring-1 ring-edge ring-inset ${className}`}
    >
      <AdaptiveImage
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
          <div className="absolute inset-0" {...artworkTarget("poster", path)}>
            <AdaptiveImage
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

const held = new Map<string, HTMLImageElement>();

function hold(src: string) {
  if (held.has(src)) return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = readable(src);
  void image.decode().catch(() => {});
  held.set(src, image);
  while (held.size > KEEP) held.delete(held.keys().next().value as string);
}

async function ready(path: string) {
  const match = PAGE.exec(path);
  if (!match) return;
  const kind = match[1] as "movie" | "person";
  const id = Number(match[2]);
  const chosen = artworkStore.getSnapshot()[artworkKey(kind, id)]?.backdrop;
  if (chosen) {
    const src = tmdbImageUrl("backdrop", chosen, "original");
    if (src) hold(src);
    return;
  }
  const response = await fetch(`/api/backdrop?kind=${kind}&id=${id}`);
  if (!response.ok) return;
  const { path: picture } = (await response.json()) as { path: unknown };
  const src =
    typeof picture === "string"
      ? tmdbImageUrl("backdrop", picture, "original")
      : null;
  if (src) hold(src);
}

export function PictureForesight(): null {
  useNavigationIntent((path) => {
    ready(path).catch((error) => report("PictureForesight", error));
  });
  return null;
}
