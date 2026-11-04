"use client";

import {
  type JSX,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
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
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { DetailAction as Action } from "@/features/detail/stage";
import { createListPickerSurfaceEntry } from "@/features/lists/picker";
import { COLLECTION_ICONS } from "./constants";

function useMovieLibrary(movieId: number, key: string | null) {
  const auth = useAuth();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [library, setLibrary] = useState<{
    key: string | null;
    state: MovieLibraryState;
  }>({ key: null, state: EMPTY_MOVIE_LIBRARY });
  const [pending, setPending] = useState<MovieLibraryKind | null>(null);

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
        openSignIn();
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
    [auth.isReady, key, movieId, openSignIn, pending, state, toast],
  );

  return { isLoaded, pending, state, toggle };
}

function useDiaryLog(movieId: number, key: string | null) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
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
        router.push("/account");
        return;
      }
      toast(result.error);
    } catch (error) {
      report("MovieCollectionActions diary", error);
      toast(toUserMessage(error, { fallback: "Could not log this movie" }));
    }
    setLogging(false);
  }, [auth.isReady, key, logging, movieId, openSignIn, router, toast]);

  return { logToDiary, logging };
}

export function MovieCollectionActions({
  children,
  movieId,
}: {
  children?: ReactNode;
  movieId: number;
}): JSX.Element {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const openSignIn = useOpenSignIn();
  const accountId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = accountId ? `${accountId}:${movieId}` : null;

  const { isLoaded, pending, state, toggle } = useMovieLibrary(movieId, key);
  const { logToDiary, logging } = useDiaryLog(movieId, key);
  const disabled = !auth.isReady || !isLoaded || pending !== null || logging;

  const openLists = () => {
    if (!auth.isReady) return;
    if (key) void openSurface(createListPickerSurfaceEntry({ movieId }));
    else openSignIn();
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
