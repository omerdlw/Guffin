import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";

export const GRID =
  "grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6";
// Five across at every size, for the profile overview's shelves.
export const PROFILE_ROW =
  "grid-cols-5 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-5 lg:grid-cols-5";
const POSTER_SIZES = "(min-width: 1024px) 16vw, (min-width: 640px) 22vw, 30vw";

export function posterImage(path: string | null, sizes = POSTER_SIZES) {
  return {
    sizes,
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342"]) ?? undefined,
  };
}
