"use client";

import { type JSX, type ReactNode, useMemo, useState } from "react";
import {
  type AmbientPalette,
  useAmbientTheme,
} from "@omerdlw/base-framework/ambient";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { usePage } from "@omerdlw/base-framework/kernel";
import {
  useArrival,
  useDeparture,
  useNavigationPayload,
} from "@omerdlw/base-framework/navigation";
import { MediaCard } from "@/design/components/media-card";
import { useSurfacePreload } from "@/design/surface/lazy";
import {
  useArtworkContextMenu,
  useArtworkPath,
} from "@/features/artwork/components/artwork";
import {
  DetailAction as Action,
  DetailStage,
} from "@/features/detail-page/components/stage";
import { MovieAction } from "@/features/reviews/components/movie-review-action";
import { describeReviewStats, useReviewsPager } from "@/features/reviews/pager";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { movieHref } from "@/shared/site";
import { COLLECTION_ICONS, type MovieArtwork, movieSwatch } from "../model";
import { watchProvidersSurface } from "../surfaces";
import { useMovieView, useReel } from "../view-context";

interface MoviePosterLinkProps {
  movie: {
    id: number;
    posterPath: string | null;
    title: string;
    year: number | null;
  };
  caption?: ReactNode;
  detail?: string | null;
  onNavigated?: () => void;
  overlay?: ReactNode;
  radius?: number;
  sizes?: string;
}

const MOVIE_FALLBACK_ICON = "solar:clapperboard-play-bold";

const POSTER_LINK_WIDTHS = ["w185", "w342"] as const;

export function MovieStage({ children }: { children: ReactNode }) {
  const { reel } = useReel();
  const light = reel ? tmdbImageUrl("backdrop", reel, "w300") : undefined;

  return <DetailStage light={light}>{children}</DetailStage>;
}

export function MoviePageChrome({
  description,
  hasProviders,
  movie,
  palette = null,
  reviews = false,
}: {
  description: string;
  hasProviders: boolean;
  movie: MovieArtwork;
  palette?: AmbientPalette | null;
  reviews?: boolean;
}): null {
  const posterPath = useArtworkPath(
    "movie",
    movie.id,
    "poster",
    movie.posterPath,
  );
  const backdropPath = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const poster = tmdbImageUrl("poster", posterPath, "w185");
  const swatch = movieSwatch(backdropPath, posterPath);

  useArtworkContextMenu({
    defaults: { backdrop: movie.backdropPath, poster: movie.posterPath },
    id: movie.id,
    kind: "movie",
  });

  const { openSurface } = useDockActions();
  useSurfacePreload(watchProvidersSurface);
  const pager = useReviewsPager();
  const board = reviews ? pager : null;
  const action = useMemo(
    () => (
      <MovieAction
        hasProviders={hasProviders}
        reviews={reviews}
        pager={board}
        movieId={movie.id}
        onOpenProviders={() =>
          void watchProvidersSurface.open(openSurface, {
            data: {
              movieId: movie.id,
              title: movie.title,
            },
          })
        }
        title={movie.title}
      />
    ),
    [board, hasProviders, reviews, movie.id, movie.title, openSurface],
  );

  const departure = useDeparture()?.href;
  const arrival = useArrival();

  usePage({
    title: movie.title,
    dock: {
      action,
      description:
        (board ? describeReviewStats(board.stats) : description) || undefined,
      icon: poster ?? MOVIE_FALLBACK_ICON,
      name: `movie-${movie.id}`,
      targetPath: departure,
    },
  });
  const [inherited] = useState(() => arrival?.payload.palette ?? undefined);
  const { palette: lit } = useAmbientTheme({
    image: swatch,
    initialPalette: palette?.source === swatch ? palette : inherited,
  });
  useNavigationPayload("palette", lit);

  return null;
}

export function MoviePosterPlaceholder() {
  return <MediaCard framed={false} image={{ src: null }} />;
}

export function MoviePosterLink({
  caption,
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

  return (
    <MediaCard
      caption={caption}
      fallbackIcon="solar:clapperboard-play-bold"
      href={movieHref(movie.id)}
      image={{
        sizes,
        src: tmdbImageUrl("poster", posterPath, "w342"),
        srcSet:
          tmdbImageSrcSet("poster", posterPath, POSTER_LINK_WIDTHS) ??
          undefined,
      }}
      label={label}
      onNavigated={onNavigated}
      overlay={overlay}
      radius={radius}
      tooltip={label}
    />
  );
}

export function AwardsAction(): JSX.Element {
  const { toggle, view } = useMovieView();
  const open = view === "awards";

  return (
    <Action
      active={open}
      disabled={false}
      hoverLabel={open ? "Back" : undefined}
      icon={COLLECTION_ICONS.awards}
      index={4}
      label="Awards"
      onClick={() => toggle("awards")}
      secondary
      grow
    />
  );
}
