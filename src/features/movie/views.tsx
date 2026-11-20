"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DetailViews } from "@/features/detail/stage";
import { useScrollDriver } from "@/motion/react";

interface ReelState {
  project: (path: string | null) => void;
  reel: string | null;
}

type MovieViewKey = "overview" | "awards";

interface MovieViewState {
  show: (view: MovieViewKey) => void;
  toggle: (view: MovieViewKey) => void;
  view: MovieViewKey;
}

const ReelContext = createContext<ReelState>({
  project: () => {},
  reel: null,
});

export const useReel = () => use(ReelContext);

export function ReelProvider({ children }: { children: ReactNode }) {
  const [reel, setReel] = useState<string | null>(null);
  const driver = useScrollDriver();

  const project = useCallback(
    (path: string | null) => {
      setReel(path);
      if (!path) return;
      if (driver.active) driver.to(0);
      else window.scrollTo({ behavior: "smooth", top: 0 });
    },
    [driver],
  );

  useEffect(() => {
    if (!reel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reel]);

  const value = useMemo(() => ({ project, reel }), [project, reel]);
  return <ReelContext value={value}>{children}</ReelContext>;
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

export function MovieViews({
  views,
}: {
  views: Record<MovieViewKey, ReactNode>;
}) {
  const { view } = useMovieView();
  return <DetailViews shown={view} views={views} />;
}
