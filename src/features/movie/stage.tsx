"use client";

import { type JSX, type ReactNode, useMemo, useState } from "react";
import { usePage } from "@omerdlw/base-framework/kernel";
import {
  type AmbientPalette,
  useAmbientTheme,
} from "@omerdlw/base-framework/modules/ambient";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import {
  useArrival,
  useDeparture,
  useNavigationPayload,
} from "@omerdlw/base-framework/modules/navigation";
import {
  useArtworkContextMenu,
  useArtworkPath,
} from "@/features/artwork/artwork";
import { DetailAction as Action, DetailStage } from "@/features/detail/stage";
import { MovieAction } from "@/features/reviews/movie-action";
import { movieHref } from "@/lib/project";
import {
  type MovieDetails,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { MediaCard } from "@/ui/media";
import {
  COLLECTION_ICONS,
  MOVIE_FALLBACK_ICON,
  POSTER_LINK_WIDTHS,
} from "./constants";
import { useMovieView, useReel } from "./views";
import type { MoviePosterLinkProps } from "./types";
import { describeMovie, movieSwatch } from "./utils";
import { createWatchProvidersSurfaceEntry } from "./watch-providers";

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

export function MoviePageChrome({
  movie,
  palette = null,
}: {
  movie: MovieDetails;
  palette?: AmbientPalette | null;
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
  const hasProviders = Object.keys(movie.watchProviders).length > 0;
  const action = useMemo(
    () => (
      <MovieAction
        hasProviders={hasProviders}
        movieId={movie.id}
        onOpenProviders={() =>
          void openSurface(
            createWatchProvidersSurfaceEntry({
              movieId: movie.id,
              title: movie.title,
            }),
          )
        }
        title={movie.title}
      />
    ),
    [hasProviders, movie.id, movie.title, openSurface],
  );

  const departure = useDeparture()?.href;
  const arrival = useArrival();

  usePage({
    title: movie.title,
    dock: {
      action,
      description: describeMovie(movie) || undefined,
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
      label="Awards"
      onClick={() => toggle("awards")}
      secondary
      grow
    />
  );
}
