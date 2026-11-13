"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import {
  applyMovieLibraryChange,
  type MovieLibraryKind,
} from "@/features/account/account";
import {
  getLibraryMarksAction,
  setMovieLibraryAction,
} from "@/features/account/actions";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in-surface";
import { EMPTY_FILM_IDS } from "./constants";
import type { CanonFilm, Marks } from "./types";

export function useCanonMarks(films: CanonFilm[]) {
  const auth = useAuth();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [pending, setPending] = useState(false);
  const [marks, setMarks] = useState<Marks>({
    account: null,
    listed: EMPTY_FILM_IDS,
    watched: EMPTY_FILM_IDS,
  });

  const account = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const known = account !== null && marks.account === account;
  const watched = known ? marks.watched : EMPTY_FILM_IDS;
  const listed = known ? marks.listed : EMPTY_FILM_IDS;
  const ids = useMemo(() => films.map((film) => film.id), [films]);
  const mediaType = films[0]?.mediaType ?? "movie";
  const seenCount = useMemo(
    () => films.filter((film) => watched.has(film.id)).length,
    [films, watched],
  );

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    getLibraryMarksAction(ids, mediaType)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          report("Top 100 marks", result.error);
          return;
        }
        setMarks({
          account,
          listed: new Set(result.watchlist),
          watched: new Set(result.watched),
        });
      })
      .catch((error) => report("Top 100 marks", error));
    return () => {
      cancelled = true;
    };
  }, [account, ids, mediaType]);

  const toggle = useCallback(
    async (
      target: CanonFilm,
      kind: Extract<MovieLibraryKind, "watched" | "watchlist">,
    ) => {
      if (!auth.isReady || pending) return;
      if (!account) {
        openSignIn();
        return;
      }
      const before = marks;
      const state = {
        liked: false,
        watched: watched.has(target.id),
        watchlist: listed.has(target.id),
      };
      const apply = (next: typeof state) => {
        const nextWatched = new Set(watched);
        const nextListed = new Set(listed);
        if (next.watched) nextWatched.add(target.id);
        else nextWatched.delete(target.id);
        if (next.watchlist) nextListed.add(target.id);
        else nextListed.delete(target.id);
        setMarks({ account, listed: nextListed, watched: nextWatched });
      };
      apply(applyMovieLibraryChange(state, kind, !state[kind]));
      setPending(true);
      try {
        const result = await setMovieLibraryAction(
          target.id,
          kind,
          !state[kind],
          target.mediaType ?? "movie",
        );
        if (result.success) apply(result.state);
        else {
          setMarks(before);
          toast(result.error);
        }
      } catch (error) {
        report("Top 100 toggle", error);
        setMarks(before);
        toast(
          toUserMessage(error, { fallback: "Could not update your library" }),
        );
      } finally {
        setPending(false);
      }
    },
    [account, auth.isReady, listed, marks, openSignIn, pending, toast, watched],
  );

  return {
    account,
    known,
    listed,
    pending,
    ready: auth.isReady,
    seenCount,
    toggle,
    watched,
  };
}
