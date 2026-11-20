"use client";

import { type PointerEvent, type RefObject, useEffect, useRef } from "react";
import { detailPart } from "./motion";

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
