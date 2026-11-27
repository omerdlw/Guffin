"use client";

import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DetailAction,
  DetailViews,
} from "@/features/detail-page/components/stage";
import type { Awards } from "@/infrastructure/tmdb/model";

type PersonViewKey = "main" | "timeline" | "awards";

interface AwardTotals {
  nominations: number;
  wins: number;
}

interface PersonViewState {
  awards: AwardTotals | null;
  focusYear: number | null;
  hasTimeline: boolean;
  openTimeline: (year: number) => void;
  toggle: (view: Exclude<PersonViewKey, "main">) => void;
  view: PersonViewKey;
}

const VIEW_ACTIONS: readonly {
  icon: { off: string; on: string };
  key: Exclude<PersonViewKey, "main">;
  label: string;
}[] = [
  {
    icon: { off: "solar:sort-by-time-linear", on: "solar:sort-by-time-bold" },
    key: "timeline",
    label: "Timeline",
  },
  {
    icon: { off: "solar:cup-star-linear", on: "solar:cup-star-bold" },
    key: "awards",
    label: "Awards",
  },
];

const PersonViewContext = createContext<PersonViewState | null>(null);

export function PersonViewProvider({
  awards,
  children,
  hasTimeline,
}: {
  awards: Promise<Awards | null>;
  children: ReactNode;
  hasTimeline: boolean;
}) {
  const [view, setView] = useState<PersonViewKey>("main");
  const [focusYear, setFocusYear] = useState<number | null>(null);
  const [totals, setTotals] = useState<AwardTotals | null>(null);

  useEffect(() => {
    let current = true;
    void awards.then((resolved) => {
      if (!current) return;
      setTotals(
        resolved && resolved.organizations.length > 0
          ? { nominations: resolved.nominations, wins: resolved.wins }
          : null,
      );
    });
    return () => {
      current = false;
    };
  }, [awards]);

  const toggle = useCallback((target: Exclude<PersonViewKey, "main">) => {
    setFocusYear(null);
    setView((current) => (current === target ? "main" : target));
  }, []);
  const openTimeline = useCallback((year: number) => {
    setFocusYear(year);
    setView("timeline");
  }, []);

  const value = useMemo(
    () => ({
      awards: totals,
      focusYear,
      hasTimeline,
      openTimeline,
      toggle,
      view,
    }),
    [focusYear, hasTimeline, openTimeline, toggle, totals, view],
  );
  return <PersonViewContext value={value}>{children}</PersonViewContext>;
}

export function usePersonView(): PersonViewState {
  const state = use(PersonViewContext);
  if (!state) {
    throw new Error("usePersonView needs a PersonViewProvider above it");
  }
  return state;
}

export function PersonViews({
  views,
}: {
  views: Record<PersonViewKey, ReactNode>;
}) {
  const { focusYear, view } = usePersonView();

  return (
    <DetailViews
      focus={focusYear === null ? null : `[data-year="${focusYear}"]`}
      shown={view}
      views={views}
    />
  );
}

export function PersonViewActions(): JSX.Element | null {
  const { awards, hasTimeline, toggle, view } = usePersonView();
  const shown = VIEW_ACTIONS.filter(({ key }) =>
    key === "timeline" ? hasTimeline : awards !== null,
  );
  if (shown.length === 0) return null;

  return (
    <div className="flex gap-3">
      {shown.map(({ icon, key, label }, index) => (
        <DetailAction
          index={index}
          active={view === key}
          grow
          hoverLabel={view === key ? "Back" : undefined}
          icon={icon}
          key={key}
          label={label}
          onClick={() => toggle(key)}
        />
      ))}
    </div>
  );
}
