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
import { movieSwatch } from "@/features/movie/movie";
import { watchProvidersSurface } from "@/features/movie/surfaces";
import { MovieAction } from "@/features/reviews/movie-action";
import { describeReviewStats, useReviewsPager } from "@/features/reviews/pager";
import { type ShowDetails, tmdbImageUrl } from "@/lib/tmdb/shared";
import { formatShowYears } from "./show";

const SHOW_FALLBACK_ICON = "solar:tv-bold";

function describeShow(
  show: Pick<
    ShowDetails,
    | "endYear"
    | "inProduction"
    | "networks"
    | "releaseYear"
    | "seasonsCount"
    | "status"
  >,
): string {
  const airing = show.status === "Returning Series" || show.inProduction;
  return [
    formatShowYears(show.releaseYear, show.endYear, airing),
    show.seasonsCount
      ? `${show.seasonsCount} season${show.seasonsCount === 1 ? "" : "s"}`
      : null,
    show.networks[0]?.name ?? null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ShowPageChrome({
  palette = null,
  reviews = false,
  show,
}: {
  palette?: AmbientPalette | null;
  reviews?: boolean;
  show: Pick<
    ShowDetails,
    | "backdropPath"
    | "endYear"
    | "id"
    | "inProduction"
    | "networks"
    | "posterPath"
    | "releaseYear"
    | "seasonsCount"
    | "status"
    | "title"
    | "watchProviders"
  >;
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
  const hasProviders = Object.keys(show.watchProviders).length > 0;

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
        (board ? describeReviewStats(board.stats) : describeShow(show)) ||
        undefined,
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
