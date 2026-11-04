"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { animate, useReducedMotion } from "motion/react";
import { tween } from "@/config/theme/motion";
import { POINTS } from "@/motion/engine/curve";
import { step } from "@/motion/engine/ladder";

// One sheet for the whole list. It rests behind whichever option is active and
// glides to the next one on a tween (never a scale, so its ring and corners
// stay true while it crosses from a poster to a row). When nothing is active it
// fades where it stands; the first option after that gets it placed unseen and
// faded in, so it never travels in from wherever it last was.
const GLIDE = tween(step(-1.5), POINTS.expo);
const FADE = tween(step(-2), POINTS.expo);
const STILL = { duration: 0 };

// A poster fills its slot, so its sheet is a frame around it: concentric with
// the poster's own corner.
const HALO = 4;

function offsetIn(list: HTMLElement, option: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = option;
  while (node && node !== list) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export function ResultSheet({
  activeId,
  listRef,
}: {
  activeId: string | null;
  listRef: RefObject<HTMLElement | null>;
}) {
  const sheet = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = sheet.current;
    const list = listRef.current;
    if (!el || !list) return;

    const option = activeId ? document.getElementById(activeId) : null;
    if (!option) {
      if (placed.current) {
        placed.current = false;
        animate(el, { opacity: 0 }, reduced ? STILL : FADE);
      }
      return;
    }

    const place = (unseen: boolean) => {
      const tile = option.dataset.kind === "tile";
      const inset = tile ? HALO : 0;
      const { x, y } = offsetIn(list, option);
      el.dataset.kind = option.dataset.kind;
      animate(
        el,
        {
          height: option.offsetHeight + inset * 2,
          width: option.offsetWidth + inset * 2,
          x: x - inset,
          y: y - inset,
        },
        unseen || reduced ? STILL : GLIDE,
      );
    };

    place(!placed.current);
    if (!placed.current) {
      placed.current = true;
      animate(el, { opacity: 1 }, reduced ? STILL : FADE);
    }

    // The list moves under the sheet (images settle, rows change height): it
    // follows the option rather than staying where the option was.
    const observer = new ResizeObserver(() => place(false));
    observer.observe(list);
    observer.observe(option);
    return () => observer.disconnect();
  }, [activeId, listRef, reduced]);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-0 rounded-card bg-grade/15 opacity-0 ring-1 ring-grade/25 transition-colors duration-move ease-out-expo ring-inset data-[kind=tile]:ring-grade/50"
      ref={sheet}
    />
  );
}
