"use client";

import { useRef, type ReactNode } from "react";
import { MAIN_COLUMN_CLASS, VIEW_CLASS } from "@/ui";
import { useScrollDriver } from "@/motion/engine";
import { DetailDeck } from "../motion";

const TOP_MARGIN = 24;

// The column switches between the page's views (a film's overview and its
// awards, a person's work, timeline and awards). Each view is a column of its
// own sections: the shown one leaves as a whole, and the next plays each of
// its sections as they are reached. As the switch lands, the column is
// brought back into view if it has been scrolled out of reach, or brought to
// the element `focus` names inside it.
export function DetailViews<K extends string>({
  focus = null,
  shown,
  views,
}: {
  focus?: string | null;
  shown: K;
  views: Record<K, ReactNode>;
}) {
  const column = useRef<HTMLDivElement>(null);
  const driver = useScrollDriver();

  const scroll = (to: number) => {
    if (driver.active) driver.to(to, { immediate: true });
    window.scrollTo({ top: to, behavior: "instant" });
  };

  const bring = () => {
    const element = column.current;
    if (!element) return;
    const target = focus ? element.querySelector(focus) : null;
    if (target) {
      const { top } = target.getBoundingClientRect();
      scroll(top + window.scrollY - TOP_MARGIN * 2);
      return;
    }
    const { top } = element.getBoundingClientRect();
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    if (top >= 0 && (wide || top <= window.innerHeight * 0.6)) return;
    scroll(top + window.scrollY - TOP_MARGIN);
  };

  return (
    <div className={MAIN_COLUMN_CLASS} ref={column}>
      <DetailDeck
        onSwitch={bring}
        shown={shown}
        viewClassName={VIEW_CLASS}
        views={views}
      />
    </div>
  );
}
