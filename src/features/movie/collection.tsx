"use client";

import {
  type JSX,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useToast } from "@omerdlw/base-framework/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useSurfacePreload } from "@/design/lazy-surface";
import {
  applyMovieLibraryChange,
  EMPTY_MOVIE_LIBRARY,
  localDiaryDate,
  type MovieLibraryKind,
  type MovieLibraryState,
} from "@/features/account/account";
import {
  getMovieLibraryAction,
  logMovieToDiaryAction,
  setMovieLibraryAction,
} from "@/features/account/actions";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { DetailAction as Action } from "@/features/detail/stage";
import { listPickerSurface } from "@/features/lists/surfaces";
import { SHOW_EVENTS } from "@/features/tv/show";
import { announceShowChange } from "@/features/tv/status";
import type { MediaType } from "@/lib/tmdb/shared";
import { COLLECTION_ICONS } from "./movie";

function useMovieLibrary(
  movieId: number,
  key: string | null,
  mediaType: MediaType,
) {
  const auth = useAuth();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [library, setLibrary] = useState<{
    key: string | null;
    state: MovieLibraryState;
  }>({ key: null, state: EMPTY_MOVIE_LIBRARY });
  const [pending, setPending] = useState<MovieLibraryKind | null>(null);
  const [version, setVersion] = useState(0);

  useGlobalEvent<{ showId: number }>(
    key && mediaType === "tv" ? SHOW_EVENTS.CHANGE : null,
    (change) => change.showId === movieId && setVersion((v) => v + 1),
  );

  const isLoaded = key === null || library.key === key;
  const state =
    key !== null && library.key === key ? library.state : EMPTY_MOVIE_LIBRARY;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getMovieLibraryAction(movieId, mediaType)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setLibrary({ key, state: result.state });
        else report("MovieCollectionActions load", result.error);
      })
      .catch((error) => report("MovieCollectionActions load", error));

    return () => {
      cancelled = true;
    };
  }, [key, mediaType, movieId, version]);

  const toggle = useCallback(
    async (kind: MovieLibraryKind) => {
      if (!auth.isReady || pending) return;
      if (!key) {
        openSignIn();
        return;
      }

      const before = state;
      const active = !before[kind];
      setPending(kind);
      setLibrary({ key, state: applyMovieLibraryChange(before, kind, active) });

      try {
        const result = await setMovieLibraryAction(
          movieId,
          kind,
          active,
          mediaType,
        );
        if (result.success) {
          setLibrary({ key, state: result.state });
          if (mediaType === "tv" && kind === "watched") {
            announceShowChange({ showId: movieId });
          }
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
    [auth.isReady, key, mediaType, movieId, openSignIn, pending, state, toast],
  );

  return { isLoaded, pending, state, toggle };
}

function useDiaryLog(movieId: number, key: string | null) {
  const auth = useAuth();
  const toast = useToast();
  const { navigate } = useDockActions();
  const openSignIn = useOpenSignIn();
  const [logging, setLogging] = useState(false);

  const logToDiary = useCallback(async () => {
    if (!auth.isReady || logging) return;
    if (!key) {
      openSignIn();
      return;
    }

    setLogging(true);
    try {
      const result = await logMovieToDiaryAction(movieId, localDiaryDate());
      if (result.success) {
        void navigate("/account");
        return;
      }
      toast(result.error);
    } catch (error) {
      report("MovieCollectionActions diary", error);
      toast(toUserMessage(error, { fallback: "Could not log this movie" }));
    }
    setLogging(false);
  }, [auth.isReady, key, logging, movieId, navigate, openSignIn, toast]);

  return { logToDiary, logging };
}

export function MovieCollectionActions({
  children,
  mediaType = "movie",
  movieId,
}: {
  children?: ReactNode;
  mediaType?: MediaType;
  movieId: number;
}): JSX.Element {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  useSurfacePreload(listPickerSurface);
  const openSignIn = useOpenSignIn();
  const accountId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = accountId ? `${accountId}:${mediaType}:${movieId}` : null;
  const show = mediaType === "tv";

  const { isLoaded, pending, state, toggle } = useMovieLibrary(
    movieId,
    key,
    mediaType,
  );
  const { logToDiary, logging } = useDiaryLog(movieId, key);
  const disabled = !auth.isReady || !isLoaded || pending !== null || logging;

  const openLists = () => {
    if (!auth.isReady) return;
    if (key) {
      void listPickerSurface.open(openSurface, {
        data: { mediaType, movieId },
      });
    } else openSignIn();
  };

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
            hoverLabel={show ? "Not finished" : "Unwatch"}
            icon={COLLECTION_ICONS.watched}
            label={show ? "Finished" : "Watched"}
            onClick={() => void toggle("watched")}
          />
        </>
      ) : (
        <>
          <Action
            active={false}
            disabled={disabled}
            icon={COLLECTION_ICONS.watched}
            label={show ? "Mark finished" : "Mark watched"}
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
        {show ? null : (
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
        )}
        {children}
      </div>
    </div>
  );
}
