"use client";

import { useEffect } from "react";

const CARD = ".cine-card";
const FRAME = "[data-slot='frame']";
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * Media cards lean a little toward the pointer. One listener for the whole
 * app: while the pointer moves over a card it writes --tilt-x / --tilt-y
 * (-0.5 to 0.5) on that card's frame, once per frame; the frame's own
 * transition (cinematic.css) does the easing. Nothing is read on scroll.
 */
export function CardTilt(): null {
  useEffect(() => {
    const fine = matchMedia(FINE_POINTER);
    let frame: HTMLElement | null = null;
    let raf = 0;
    let at = { x: 0, y: 0 };

    const rest = (element: HTMLElement | null) => {
      element?.style.removeProperty("--tilt-x");
      element?.style.removeProperty("--tilt-y");
    };

    const draw = () => {
      raf = 0;
      if (!frame) return;
      const box = frame.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const x = Math.max(
        -0.5,
        Math.min(0.5, (at.x - box.left) / box.width - 0.5),
      );
      const y = Math.max(
        -0.5,
        Math.min(0.5, (at.y - box.top) / box.height - 0.5),
      );
      frame.style.setProperty("--tilt-x", x.toFixed(3));
      frame.style.setProperty("--tilt-y", y.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType !== "mouse") return;
      const card = (event.target as Element | null)?.closest<HTMLElement>(CARD);
      const next = card?.querySelector<HTMLElement>(FRAME) ?? null;
      if (next !== frame) {
        rest(frame);
        frame = next;
      }
      if (!frame) return;
      at = { x: event.clientX, y: event.clientY };
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const onLeave = (event: PointerEvent) => {
      if (!frame) return;
      const to = event.relatedTarget as Element | null;
      if (to && frame.closest(CARD)?.contains(to)) return;
      rest(frame);
      frame = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      rest(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, []);

  return null;
}
