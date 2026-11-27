"use client";

import { useEffect } from "react";
import {
  clamp,
  drive,
  feel,
  type Goal,
  glassDepth,
  spring,
  swellBox,
} from "@/design/components/glass-thumb";

// The compact row, and what in it the lens rides over: the dock's icon
// commands. (The card's action buttons carry their own liquid press.)
const ROW = ".dock-compact";
const TARGET = ".dock-command";
const OFF = ":disabled, [aria-disabled='true']";
const REDUCED = "(prefers-reduced-motion: reduce)";

// The press glass: one clear lens (like the segmented control's thumb) that
// swells under the pressed command and glides with the finger across the
// row; let go on another command and that one is pressed. It sits first in
// the row, under the icons, so it never clouds them.
const LENS_CLASS =
  "liquid liquid-clear pointer-events-none absolute left-0 rounded-full";

const TRAVEL = feel(260, 0.82);
const GLASS_ON = feel(520, 1);
const GLASS_OFF = feel(190, 0.9);
const JELLY = feel(200, 0.5);
// How far the lens swells past the control, in px at full press.
const SWELL_X = 6;
const SWELL_Y = 8;

interface Box {
  element: HTMLElement;
  left: number;
  top: number;
  width: number;
  height: number;
}

const enabled = (element: HTMLElement) => !element.matches(OFF);

/** The box under `x` (row px), else the nearest one. */
function nearest(boxes: readonly Box[], x: number): number {
  let best = -1;
  let gap = Infinity;
  boxes.forEach((box, index) => {
    const d =
      x < box.left
        ? box.left - x
        : x > box.left + box.width
          ? x - box.left - box.width
          : 0;
    if (d < gap) {
      gap = d;
      best = index;
    }
  });
  return best;
}

/**
 * The compact row's press lens. Listens on the document, so it needs no hook
 * into the dock: a press inside the compact row grows the lens there. Reads
 * geometry only on the press itself, never per frame.
 */
export function useCompactLens(): void {
  useEffect(() => {
    const reduced = matchMedia(REDUCED);
    let row: HTMLElement | null = null;
    let lens: HTMLElement | null = null;
    let boxes: Box[] = [];
    let rowLeft = 0;
    let target = -1;
    let down: HTMLElement | null = null;
    let pressed = false;
    const x = spring();
    const w = spring();
    const y = spring();
    const h = spring();
    const amount = spring();
    const stretch = spring();

    const goals = (): Goal[] => {
      const box = boxes[target];
      if (!box) return [[amount, 0, GLASS_OFF]];
      return [
        [x, box.left, TRAVEL],
        [w, box.width, TRAVEL],
        [y, box.top, TRAVEL],
        [h, box.height, TRAVEL],
        [amount, pressed ? 1 : 0, pressed ? GLASS_ON : GLASS_OFF],
        [stretch, clamp(Math.abs(x.v) / 2600, 0, 0.16), JELLY],
      ];
    };

    const draw = () => {
      if (!lens) return;
      const g = clamp(amount.x, 0, 1);
      const across = Math.max(w.x, 1);
      const tall = Math.max(h.x, 1);
      const sx = 1 + (SWELL_X * 2 * g) / across + stretch.x;
      const sy = 1 + (SWELL_Y * 2 * g) / tall - stretch.x * 0.6;
      lens.style.visibility = g > 0.004 ? "visible" : "hidden";
      lens.style.top = `${y.x.toFixed(2)}px`;
      swellBox(lens, x.x, w.x, h.x, sx, sy);
      lens.style.opacity = clamp(g * 1.6, 0, 1).toFixed(3);
      lens.style.setProperty("--liquid-drop", glassDepth(g));
    };

    const motion = drive(goals, draw, () => reduced.matches);

    // The lens lives in the row it presses in; the row is the dock's and
    // comes and goes with the compact layout, so it is (re)made on demand.
    const attach = (next: HTMLElement) => {
      if (lens?.isConnected && row === next) return;
      lens?.remove();
      row = next;
      lens = document.createElement("span");
      lens.className = LENS_CLASS;
      lens.setAttribute("aria-hidden", "true");
      lens.dataset.glint = "chosen";
      lens.dataset.part = "compact-lens";
      lens.style.visibility = "hidden";
      lens.style.opacity = "0";
      next.prepend(lens);
      amount.x = amount.v = 0;
    };

    const measure = () => {
      if (!row) return;
      const frame = row.getBoundingClientRect();
      rowLeft = frame.left;
      boxes = Array.from(row.querySelectorAll<HTMLElement>(TARGET))
        .filter(enabled)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            element,
            left: box.left - frame.left,
            top: box.top - frame.top,
            width: box.width,
            height: box.height,
          };
        });
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const control = (event.target as Element | null)?.closest<HTMLElement>(
        TARGET,
      );
      const next = control?.closest<HTMLElement>(ROW);
      if (!control || !next || !enabled(control)) return;
      attach(next);
      measure();
      target = boxes.findIndex((box) => box.element === control);
      const box = boxes[target];
      if (!box) return;
      // A fresh press starts on the control; a quick second one glides.
      if (amount.x < 0.05) {
        x.x = box.left;
        w.x = box.width;
        y.x = box.top;
        h.x = box.height;
        x.v = w.v = y.v = h.v = 0;
      }
      pressed = true;
      down = control;
      motion.wake();
    };

    const onMove = (event: PointerEvent) => {
      if (!pressed) return;
      const next = nearest(boxes, event.clientX - rowLeft);
      if (next !== target) {
        target = next;
        motion.wake();
      }
    };

    const onUp = (event: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      const chosen = boxes[target]?.element;
      // Slid onto another control: that one is the press. (On the same
      // control the browser's own click does it.)
      if (event.type === "pointerup" && chosen && chosen !== down) {
        chosen.click();
      }
      down = null;
      motion.wake();
    };

    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
      motion.stop();
      lens?.remove();
    };
  }, []);
}
