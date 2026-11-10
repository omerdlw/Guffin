"use client";

import {
  createContext,
  type FocusEvent,
  type ReactNode,
  use,
  useId,
  useMemo,
  useState,
} from "react";
import { LayoutGroup } from "@/motion/lib";
import { SlidingHighlight } from "../indicator";

/*
 * A list of rows shares one hover: a single fill slides after the pointer or
 * the keyboard focus, so no row draws a hover background of its own.
 *
 *   <HighlightGroup>
 *     {rows.map((row) => <Row key={row.id} … />)}   // each calls useHighlight(row.id)
 *   </HighlightGroup>
 */

interface Tracker {
  active: string | null;
  focus: (key: string | null) => void;
  hover: (key: string | null) => void;
  id: string;
}

const HighlightContext = createContext<Tracker | null>(null);

/** Holds the shared highlight for the rows inside it. */
export function HighlightGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const tracker = useMemo<Tracker>(
    () => ({
      active: hovered ?? focused,
      focus: setFocused,
      hover: setHovered,
      id,
    }),
    [focused, hovered, id],
  );

  return (
    <HighlightContext value={tracker}>
      <LayoutGroup id={id}>
        <div className={className} onPointerLeave={() => setHovered(null)}>
          {children}
        </div>
      </LayoutGroup>
    </HighlightContext>
  );
}

/** The highlight for one row: render `node` inside it and spread `props` on it. */
export function useHighlight(key: string, className?: string) {
  const tracker = use(HighlightContext);
  return {
    node:
      tracker?.active === key ? (
        <SlidingHighlight
          className={className}
          layoutId={`highlight-${tracker.id}`}
        />
      ) : null,
    props: {
      onBlur: () => tracker?.focus(null),
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (event.target.matches(":focus-visible")) tracker?.focus(key);
      },
      onPointerEnter: () => tracker?.hover(key),
    },
  };
}

/** Clears the highlight when the pointer enters a part that is not a row. */
export function useHighlightReset() {
  const tracker = use(HighlightContext);
  return { onPointerEnter: () => tracker?.hover(null) };
}
