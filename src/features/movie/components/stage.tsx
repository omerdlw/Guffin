"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useArtworkPath } from "@/features/artwork";
import { Room } from "@/motion/engine";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { MovieStageRoot } from "../motion";
import { movieSwatch } from "../utils";
import { useReel } from "./reel";

// The room is lit by the picture in front of it: a still the hand rests on,
// the still being projected, or the film's own backdrop.
const LeadContext = createContext<(src: string | null) => void>(() => {});

export const useLead = () => use(LeadContext);

// Which set of pictures the gallery wall opens on.
interface WallSet {
  set: string | null;
  choose: (set: string) => void;
}

const WallSetContext = createContext<WallSet>({ set: null, choose: () => {} });

export const useWallSet = () => use(WallSetContext);

export function MovieStage({
  children,
  movie,
}: {
  children: ReactNode;
  movie: Pick<MovieDetails, "backdropPath" | "id" | "posterPath">;
}) {
  const pathname = usePathname();
  const { reel } = useReel();
  const [lead, setLead] = useState<string | null>(null);
  const [set, choose] = useState<string | null>(null);
  const backdrop = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const poster = useArtworkPath("movie", movie.id, "poster", movie.posterPath);
  const grade =
    lead ??
    (reel ? tmdbImageUrl("backdrop", reel, "w300") : null) ??
    movieSwatch(backdrop, poster);
  const wall = useMemo(() => ({ set, choose }), [set]);

  return (
    <MovieStageRoot grade={grade} memory={pathname}>
      <Room />
      <LeadContext value={setLead}>
        <WallSetContext value={wall}>{children}</WallSetContext>
      </LeadContext>
    </MovieStageRoot>
  );
}
