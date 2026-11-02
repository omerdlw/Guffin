"use client";

import { useArtworkPath } from "@/features/artwork";
import { Intermission } from "@/motion/effects";
import { POINTS, step, useWall } from "@/motion/engine";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { useMovieAct } from "../motion";
import { readable } from "@/motion/gl";

const pictureOf = (src: string | null) => (src ? readable(src) : null);

// A room left alone long enough shows an intermission card: it comes after
// eleven rungs of stillness, settles in on the plate's rung and drifts slowly.
const INTERMISSION = {
  after: step(11),
  drift: step(9),
  enter: step(4),
  leave: step(2),
};

export function MovieProjection({
  movie,
}: {
  movie: Pick<MovieDetails, "backdropPath" | "id" | "title">;
}) {
  const act = useMovieAct();
  const away = (useWall()?.phase ?? "page") !== "page";
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );

  return (
    <Intermission
      {...INTERMISSION}
      ease={POINTS.silk}
      image={pictureOf(tmdbImageUrl("backdrop", path, "original"))}
      paused={act === "leaving" || act === "gone" || away}
      title={movie.title}
    />
  );
}
