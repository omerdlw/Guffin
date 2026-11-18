"use client";

import {
  type FocusEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
} from "react";
import { detailPart } from "./motion";

// One highlight for a whole list: it glides from row to row under the hand
// (the stage's `trace` follow eases it), lands in place and fades in where it
// first appears, and fades out when the hand leaves the list. The list is
// `relative`; each row spreads `TRACE_ROW`.

export const TRACE_ROW = { "data-trace-row": "" } as const;

const ROW = "[data-trace-row]";

export function useTrace(list: HTMLElement | null) {
  const trace = useRef<HTMLSpanElement>(null);
  const shown = useRef<Element | null>(null);

  const place = (element: HTMLElement, row: Element) => {
    if (!list) return;
    const from = list.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    element.style.translate = `${box.left - from.left}px ${box.top - from.top}px`;
    element.style.width = `${box.width}px`;
    element.style.height = `${box.height}px`;
  };

  const show = (row: Element | null) => {
    const element = trace.current;
    if (!element || !list || row === shown.current) return;
    shown.current = row;
    if (!row) {
      element.style.opacity = "0";
      return;
    }
    const appearing = element.style.opacity !== "1";
    if (appearing) element.style.transition = "none";
    place(element, row);
    if (appearing) {
      void element.offsetWidth;
      element.style.transition = "";
    }
    element.style.opacity = "1";
  };

  // A row that grows or shrinks under the highlight (one opened) takes it
  // along.
  useEffect(() => {
    if (!list) return;
    const observer = new ResizeObserver(() => {
      const row = shown.current;
      if (row && trace.current) place(trace.current, row);
    });
    observer.observe(list);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const rowOf = (target: EventTarget) =>
    target instanceof Element ? target.closest(ROW) : null;

  return {
    trace,
    props: {
      onPointerOver: (event: PointerEvent) => {
        const row = rowOf(event.target);
        if (row) show(row);
      },
      onPointerLeave: () => show(null),
      onFocus: (event: FocusEvent) => {
        if (event.target.matches(":focus-visible")) show(rowOf(event.target));
      },
      onBlur: () => show(null),
    },
  };
}

export function Trace({ trace }: { trace: RefObject<HTMLSpanElement | null> }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 rounded-tile bg-fill-hover opacity-0 ring-1 ring-edge-hover ring-inset"
      ref={trace}
      {...detailPart("trace")}
    />
  );
}
