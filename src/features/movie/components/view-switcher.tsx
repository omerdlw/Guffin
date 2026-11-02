"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DetailViews } from "@/features/detail";

type MovieViewKey = "overview" | "awards";

interface MovieViewState {
  show: (view: MovieViewKey) => void;
  toggle: (view: MovieViewKey) => void;
  view: MovieViewKey;
}

const MovieViewContext = createContext<MovieViewState | null>(null);

export function MovieViewProvider({
  children,
  initialView = "overview",
}: {
  children: ReactNode;
  initialView?: MovieViewKey;
}) {
  const [view, setView] = useState<MovieViewKey>(initialView);
  const toggle = useCallback(
    (next: MovieViewKey) =>
      setView((current) => (current === next ? "overview" : next)),
    [],
  );
  const value = useMemo(
    () => ({ show: setView, toggle, view }),
    [toggle, view],
  );
  return <MovieViewContext value={value}>{children}</MovieViewContext>;
}

export function useMovieView(): MovieViewState {
  const state = use(MovieViewContext);
  if (!state) {
    throw new Error("useMovieView needs a MovieViewProvider above it");
  }
  return state;
}

// The column switches between the film's overview and its awards.
export function MovieViews({
  views,
}: {
  views: Record<MovieViewKey, ReactNode>;
}) {
  const { view } = useMovieView();
  return <DetailViews shown={view} views={views} />;
}
