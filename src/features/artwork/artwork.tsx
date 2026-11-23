"use client";

import { Suspense, useMemo, useSyncExternalStore } from "react";
import {
  type ContextMenuContextValue,
  useContextMenu,
} from "@omerdlw/base-framework/context-menu";
import { Image } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { AwardFoil } from "@/features/detail/awards";
import { type Awards, isTmdbImagePath, tmdbImageUrl } from "@/infrastructure/tmdb/shared";
import { Part } from "@/motion/stage";
import { Tilt } from "@/motion/tilt";
import {
  artworkAttributes,
  artworkKey,
  type ArtworkKind,
  type ArtworkSlot,
  artworkStore,
  resolveArtwork,
} from "./store";

interface MenuPayload {
  path: string;
  slot: ArtworkSlot;
}

interface ArtworkContextMenuOptions {
  defaults: Record<ArtworkSlot, string | null>;
  id: number;
  kind: ArtworkKind;
}

const ARTWORK_TARGET_SELECTOR = "[data-artwork]";

const ARTWORK_MENU_LABELS: Record<
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
        <Part
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
        </Part>
      )}
    </Tilt>
  );
}
