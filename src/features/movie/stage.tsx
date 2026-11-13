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
import { useSurfacePreload } from "@/design/lazy-surface";
import {
  useArtworkContextMenu,
  useArtworkPath,
} from "@/features/artwork/artwork";
import { DetailAction as Action, DetailStage } from "@/features/detail/stage";
import { useMediaType } from "@/features/media/media-type";
import { MovieAction } from "@/features/reviews/movie-action";
import { describeReviewStats, useReviewsPager } from "@/features/reviews/pager";
import { mediaHref } from "@/lib/project";
import {
  type MediaType,
  type MovieDetails,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { COLLECTION_ICONS, getDirectors, movieSwatch } from "./movie";
import { watchProvidersSurface } from "./surfaces";
import { useMovieView, useReel } from "./views";

interface MoviePosterLinkProps {
  mediaType?: MediaType;
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

const DOCK_DIRECTOR_LIMIT = 2;

const POSTER_LINK_WIDTHS = ["w185", "w342"] as const;

function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function describeMovie(movie: MovieDetails): string {
  const directors = getDirectors(movie)
    .slice(0, DOCK_DIRECTOR_LIMIT)
    .map((director) => director.name)
    .join(", ");
  return [
    directors && `by ${directors}`,
    movie.releaseYear,
    formatRuntime(movie.runtimeMinutes),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function MovieStage({
  children,
  movie,
}: {
  children: ReactNode;
  movie: Pick<MovieDetails, "backdropPath" | "id" | "posterPath">;
}) {
  const { reel } = useReel();
  const kind = useMediaType();
  const backdrop = useArtworkPath(
    kind,
    movie.id,
    "backdrop",
    movie.backdropPath,
  );
  const poster = useArtworkPath(kind, movie.id, "poster", movie.posterPath);
  const picture =
    (reel ? tmdbImageUrl("backdrop", reel, "w300") : null) ??
    movieSwatch(backdrop, poster);

  return <DetailStage picture={picture}>{children}</DetailStage>;
}

export function MoviePageChrome({
  movie,
  palette = null,
  reviews = false,
}: {
  movie: MovieDetails;
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
  const hasProviders = Object.keys(movie.watchProviders).length > 0;
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
        (board ? describeReviewStats(board.stats) : describeMovie(movie)) ||
        undefined,
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
  mediaType = "movie",
  movie,
  onNavigated,
  overlay,
  radius,
  sizes = "110px",
}: MoviePosterLinkProps) {
  const posterPath = useArtworkPath(
    mediaType,
    movie.id,
    "poster",
    movie.posterPath,
  );
  const title = movie.year ? `${movie.title} (${movie.year})` : movie.title;
  const label = detail ? `${title}, ${detail}` : title;

  return (
    <MediaCard
      caption={caption}
      fallbackIcon={
        mediaType === "tv" ? "solar:tv-bold" : "solar:clapperboard-play-bold"
      }
      href={mediaHref(mediaType, movie.id)}
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
      label="Awards"
      onClick={() => toggle("awards")}
      secondary
      grow
    />
  );
}
