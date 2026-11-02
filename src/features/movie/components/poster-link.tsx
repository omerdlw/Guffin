"use client";

import type { ReactNode } from "react";
import { useArtworkPath } from "@/features/artwork";
import { useCarry } from "@/motion/engine";
import { MediaCard } from "@/ui";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { movieHref } from "@/config/routes";
import { posterCarry } from "../constants";

interface MoviePosterLinkProps {
  movie: {
    id: number;
    posterPath: string | null;
    title: string;
    year: number | null;
  };
  caption?: ReactNode;
  detail?: string | null;
  carried?: boolean;
  onNavigated?: () => void;
  overlay?: ReactNode;
  radius?: number;
  sizes?: string;
}

const POSTER_WIDTHS = ["w185", "w342"] as const;
const CARRIED = "w780";

export function MoviePosterPlaceholder() {
  return <MediaCard framed={false} image={{ src: null }} />;
}

export function MoviePosterLink({
  caption,
  carried = false,
  detail = null,
  movie,
  onNavigated,
  overlay,
  radius,
  sizes = "110px",
}: MoviePosterLinkProps) {
  const posterPath = useArtworkPath(
    "movie",
    movie.id,
    "poster",
    movie.posterPath,
  );
  const title = movie.year ? `${movie.title} (${movie.year})` : movie.title;
  const label = detail ? `${title}, ${detail}` : title;
  // A carried poster is offered to the film's page, where it lands on the
  // poster there.
  const carry = useCarry(carried ? posterCarry(movie.id) : null);

  const card = (
    <MediaCard
      caption={caption}
      fallbackIcon="solar:clapperboard-play-bold"
      href={movieHref(movie.id)}
      image={{
        sizes,
        src: tmdbImageUrl("poster", posterPath, carried ? CARRIED : "w342"),
        srcSet: carried
          ? undefined
          : (tmdbImageSrcSet("poster", posterPath, POSTER_WIDTHS) ?? undefined),
      }}
      label={label}
      onNavigated={onNavigated}
      overlay={overlay}
      radius={radius}
      tooltip={label}
    />
  );
  return carried ? <div ref={carry}>{card}</div> : card;
}
