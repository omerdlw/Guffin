"use client";

import { useArtworkPath } from "@/features/artwork";
import { DetailIntermission } from "@/features/detail";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { readable } from "@/motion/gl";

const pictureOf = (src: string | null) => (src ? readable(src) : null);

export function MovieProjection({
  movie,
}: {
  movie: Pick<MovieDetails, "backdropPath" | "id" | "title">;
}) {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );

  return (
    <DetailIntermission
      image={pictureOf(tmdbImageUrl("backdrop", path, "original"))}
      title={movie.title}
    />
  );
}
