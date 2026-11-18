"use client";

import { useMemo, useState } from "react";
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
import { useSurfacePreload } from "@/design/lazy-surface";
import {
  useArtworkContextMenu,
  useArtworkPath,
} from "@/features/artwork/artwork";
import { type MovieArtwork, movieSwatch } from "@/features/movie/movie";
import { watchProvidersSurface } from "@/features/movie/surfaces";
import { MovieAction } from "@/features/reviews/movie-action";
import { describeReviewStats, useReviewsPager } from "@/features/reviews/pager";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

const SHOW_FALLBACK_ICON = "solar:tv-bold";

export function ShowPageChrome({
  description,
  hasProviders,
  palette = null,
  reviews = false,
  show,
}: {
  description: string;
  hasProviders: boolean;
  palette?: AmbientPalette | null;
  reviews?: boolean;
  show: MovieArtwork;
}): null {
  const posterPath = useArtworkPath("tv", show.id, "poster", show.posterPath);
  const backdropPath = useArtworkPath(
    "tv",
    show.id,
    "backdrop",
    show.backdropPath,
  );
  const poster = tmdbImageUrl("poster", posterPath, "w185");
  const swatch = movieSwatch(backdropPath, posterPath);

  useArtworkContextMenu({
    defaults: { backdrop: show.backdropPath, poster: show.posterPath },
    id: show.id,
    kind: "tv",
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
        mediaType="tv"
        movieId={show.id}
        onOpenProviders={() =>
          void watchProvidersSurface.open(openSurface, {
            data: {
              mediaType: "tv",
              movieId: show.id,
              title: show.title,
            },
          })
        }
        title={show.title}
      />
    ),
    [board, hasProviders, openSurface, reviews, show.id, show.title],
  );

  const departure = useDeparture()?.href;
  const arrival = useArrival();

  usePage({
    title: show.title,
    dock: {
      action,
      description:
        (board ? describeReviewStats(board.stats) : description) || undefined,
      icon: poster ?? SHOW_FALLBACK_ICON,
      name: `tv-${show.id}`,
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
