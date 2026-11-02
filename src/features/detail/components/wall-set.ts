import type { MediaCardAspect } from "@/ui";

// The pictures a gallery wall shows, one set per kind (backdrops, posters).

export interface WallPicture {
  crossOrigin?: "anonymous";
  full: string | null;
  lead: string | null;
  path: string;
  sizes?: string;
  src: string | null;
  srcSet?: string;
}

export interface WallSet {
  aspect: MediaCardAspect;
  key: string;
  label: string;
  noun: string;
  pictures: WallPicture[];
  slot: "backdrop" | "poster";
}

// How many pictures are hung at a time; more are hung as the end comes near.
export const STRETCH = 30;

export const GRID: Record<MediaCardAspect, string> = {
  free: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  poster: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8",
  square: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
  video: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
};

export const WALL_SIZES: Record<"poster" | "video", string> = {
  poster:
    "(min-width: 1536px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw",
  video:
    "(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
};
