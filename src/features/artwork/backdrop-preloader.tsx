"use client";

import { useNavigationIntent } from "@omerdlw/base-framework/navigation";
import { report } from "@omerdlw/base-framework/utils";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { readable } from "@/motion/gl";
import { artworkKey, type ArtworkKind, artworkStore } from "./store";

const ARTWORK_PAGE_PATTERN = /^\/(movie|person|tv)\/([1-9]\d{0,9})$/;

const PRELOADED_BACKDROP_LIMIT = 6;

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
