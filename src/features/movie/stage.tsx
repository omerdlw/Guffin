"use client";

import {
  type JSX,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import {
  getMovieLibraryAction,
  logMovieToDiaryAction,
  setMovieLibraryAction,
} from "@/features/account/actions";
import { EMPTY_MOVIE_LIBRARY } from "@/features/account/constants";
import type {
  MovieLibraryKind,
  MovieLibraryState,
} from "@/features/account/types";
import {
  applyMovieLibraryChange,
  localDiaryDate,
} from "@/features/account/utils";
import {
  useArtworkContextMenu,
  useArtworkPath,
} from "@/features/artwork/artwork";
import { useAuth } from "@/features/auth/provider";
import { createSignInSurfaceEntry } from "@/features/auth/sign-in";
import { DetailAction as Action, DetailStage } from "@/features/detail/stage";
import { createListPickerSurfaceEntry } from "@/features/lists/picker";
import { MovieAction } from "@/features/reviews/controls";
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
  STAGE_POSTER_WIDTHS,
} from "./constants";
import { useMovieView, useReel } from "./media";
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
          tmdbImageSrcSet("poster", posterPath, STAGE_POSTER_WIDTHS) ??
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

export function MovieCollectionActions({
  children,
  movieId,
}: {
  children?: ReactNode;
  movieId: number;
}): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { openSurface } = useDockActions();
  const accountId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = accountId ? `${accountId}:${movieId}` : null;

  const [library, setLibrary] = useState<{
    key: string | null;
    state: MovieLibraryState;
  }>({ key: null, state: EMPTY_MOVIE_LIBRARY });
  const [pending, setPending] = useState<MovieLibraryKind | null>(null);
  const [logging, setLogging] = useState(false);

  const isLoaded = key === null || library.key === key;
  const state =
    key !== null && library.key === key ? library.state : EMPTY_MOVIE_LIBRARY;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getMovieLibraryAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setLibrary({ key, state: result.state });
        else report("MovieCollectionActions load", result.error);
      })
      .catch((error) => report("MovieCollectionActions load", error));

    return () => {
      cancelled = true;
    };
  }, [key, movieId]);

  const toggle = useCallback(
    async (kind: MovieLibraryKind) => {
      if (!auth.isReady || pending) return;

      if (!key) {
        void openSurface(
          createSignInSurfaceEntry({
            next: window.location.pathname + window.location.search,
          }),
        );
        return;
      }

      const before = state;
      const active = !before[kind];
      setPending(kind);
      setLibrary({ key, state: applyMovieLibraryChange(before, kind, active) });

      try {
        const result = await setMovieLibraryAction(movieId, kind, active);
        if (result.success) {
          setLibrary({ key, state: result.state });
        } else {
          setLibrary({ key, state: before });
          toast(result.error);
        }
      } catch (error) {
        report("MovieCollectionActions toggle", error);
        setLibrary({ key, state: before });
        toast(
          toUserMessage(error, { fallback: "Could not update your library" }),
        );
      } finally {
        setPending(null);
      }
    },
    [auth.isReady, key, movieId, openSurface, pending, state, toast],
  );

  const disabled = !auth.isReady || !isLoaded || pending !== null || logging;

  const logToDiary = useCallback(async () => {
    if (!auth.isReady || logging) return;

    if (!key) {
      void openSurface(
        createSignInSurfaceEntry({
          next: window.location.pathname + window.location.search,
        }),
      );
      return;
    }

    setLogging(true);
    try {
      const result = await logMovieToDiaryAction(movieId, localDiaryDate());
      if (result.success) {
        router.push("/account");
        return;
      }
      toast(result.error);
    } catch (error) {
      report("MovieCollectionActions diary", error);
      toast(toUserMessage(error, { fallback: "Could not log this movie" }));
    }
    setLogging(false);
  }, [auth.isReady, key, logging, movieId, openSurface, router, toast]);

  const openLists = useCallback(() => {
    if (!auth.isReady) return;
    void openSurface(
      key
        ? createListPickerSurfaceEntry({ movieId })
        : createSignInSurfaceEntry({
            next: window.location.pathname + window.location.search,
          }),
    );
  }, [auth.isReady, key, movieId, openSurface]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {state.watched ? (
        <>
          <Action
            active={state.liked}
            disabled={disabled}
            hoverLabel={state.liked ? "Unlike" : undefined}
            icon={COLLECTION_ICONS.like}
            label={state.liked ? "Liked" : "Like"}
            onClick={() => void toggle("liked")}
          />
          <Action
            active
            disabled={disabled}
            hoverLabel="Unwatch"
            icon={COLLECTION_ICONS.watched}
            label="Watched"
            onClick={() => void toggle("watched")}
          />
        </>
      ) : (
        <>
          <Action
            active={false}
            disabled={disabled}
            icon={COLLECTION_ICONS.watched}
            label="Mark watched"
            onClick={() => void toggle("watched")}
          />
          <Action
            active={state.watchlist}
            disabled={disabled}
            hoverLabel={state.watchlist ? "Remove" : undefined}
            icon={COLLECTION_ICONS.watchlist}
            label={state.watchlist ? "In Watchlist" : "Watchlist"}
            onClick={() => void toggle("watchlist")}
          />
        </>
      )}
      <div className="col-span-2 flex gap-3">
        <Action
          active={false}
          disabled={!auth.isReady}
          grow
          icon={COLLECTION_ICONS.list}
          label="Add to list"
          onClick={openLists}
          secondary
          shortLabel="List"
        />
        <Action
          active={false}
          disabled={disabled}
          grow
          icon={COLLECTION_ICONS.diary}
          label="Log to diary"
          loading={logging}
          onClick={() => void logToDiary()}
          secondary
          shortLabel="Diary"
        />
        {children}
      </div>
    </div>
  );
}
