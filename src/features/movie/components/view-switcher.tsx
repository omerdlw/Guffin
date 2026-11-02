"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MAIN_COLUMN_CLASS, VIEW_CLASS } from "@/ui";
import { MovieDeck } from "../motion";
import { useScrollDriver } from "@/motion/engine";

type MovieViewKey = "overview" | "awards";

const TOP_MARGIN = 24;

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

// The column switches between the film's overview and its awards. Each view
// is a column of its own sections: the shown one leaves as a whole, and the
// next plays each of its sections as they are reached. If the column has been
// scrolled out of reach, it is brought back into view as the switch lands.
export function MovieViews({
  views,
}: {
  views: Record<MovieViewKey, ReactNode>;
}) {
  const { view } = useMovieView();
  const column = useRef<HTMLDivElement>(null);
  const driver = useScrollDriver();

  const bring = () => {
    const element = column.current;
    if (!element) return;
    const { top } = element.getBoundingClientRect();
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    if (top >= 0 && (wide || top <= window.innerHeight * 0.6)) return;
    const to = top + window.scrollY - TOP_MARGIN;
    if (driver.active) driver.to(to, { immediate: true });
    window.scrollTo({ top: to, behavior: "instant" });
  };

  return (
    <div className={MAIN_COLUMN_CLASS} ref={column}>
      <MovieDeck
        onSwitch={bring}
        shown={view}
        viewClassName={VIEW_CLASS}
        views={views}
      />
    </div>
  );
}
