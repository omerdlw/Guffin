"use client";

import type { ReactNode } from "react";
import { useArtworkPath } from "@/features/artwork";
import { DetailStage } from "@/features/detail";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { movieSwatch } from "../utils";
import { useReel } from "./reel";

// A film's room takes the still being projected, or else the film's own
// backdrop.
export function MovieStage({
  children,
  movie,
}: {
  children: ReactNode;
  movie: Pick<MovieDetails, "backdropPath" | "id" | "posterPath">;
}) {
  const { reel } = useReel();
  const backdrop = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const poster = useArtworkPath("movie", movie.id, "poster", movie.posterPath);
  const picture =
    (reel ? tmdbImageUrl("backdrop", reel, "w300") : null) ??
    movieSwatch(backdrop, poster);

  return <DetailStage picture={picture}>{children}</DetailStage>;
}
