"use client";

import { useMemo, useState } from "react";
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
import { movieSwatch } from "@/features/movie/utils";
import { createWatchProvidersSurfaceEntry } from "@/features/movie/watch-providers";
import { MovieAction } from "@/features/reviews/movie-action";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { SHOW_FALLBACK_ICON } from "./constants";
import type { ShowDetails } from "./types";
import { describeShow } from "./utils";

/** Dock card, ambient light and title for a show page. */
export function ShowPageChrome({
  palette = null,
  show,
}: {
  palette?: AmbientPalette | null;
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
  const hasProviders = Object.keys(show.watchProviders).length > 0;

  const action = useMemo(
    () => (
      <MovieAction
        hasProviders={hasProviders}
        mediaType="tv"
        movieId={show.id}
        onOpenProviders={() =>
          void openSurface(
            createWatchProvidersSurfaceEntry({
              mediaType: "tv",
              movieId: show.id,
              title: show.title,
            }),
          )
        }
        title={show.title}
      />
    ),
    [hasProviders, openSurface, show.id, show.title],
  );

  const departure = useDeparture()?.href;
  const arrival = useArrival();

  usePage({
    title: show.title,
    dock: {
      action,
      description: describeShow(show) || undefined,
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
