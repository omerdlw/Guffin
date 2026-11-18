"use client";

// What a dock action shows, moving the way the dock moves words
// (design/theme/dock-motion.ts). A label whose words change rolls whole, in
// turn: the old words rise out of the line's clip, then the new ones rise
// into it from below, so the two are never on screen together (rolled in
// the same beat, a longer label sat over a shorter one, both cut and
// misaligned). One whose number changes rolls only the digits that changed,
// odometer-style. A glyph swapping swells and fades, the new one settles in
// from a step back.
//
// Only transform and opacity, nothing blurs. Reduced motion: a cut.

import { useEffect } from "react";
import { pieces, shapeOf } from "@/design/action-text";
import { Icon, type IconProps } from "@/design/components/icon";
import { cn } from "@/design/ui";
import { AnimatePresence, motion, useReducedMotion } from "@/motion/lib";

type Ease = [number, number, number, number];

// The dock's curves and beats (φ): settle in, gather and leave.
const SETTLE: Ease = [0.236, 0.382, 0.146, 1];
const LEAVE: Ease = [0.618, 0, 0.854, 0.382];
const IN = { duration: 0.382, ease: SETTLE };
const OUT = { duration: 0.236, ease: LEAVE };
/** A rolling word travels a whole line: it leaves and enters through the
 * label's clip, never past the other one. */
const LINE = "100%";

const roll = {
  initial: { opacity: 0, y: LINE },
  animate: { opacity: 1, transition: IN, y: 0 },
  exit: { opacity: 0, transition: OUT, y: `-${LINE}` },
};

const swap = {
  initial: { opacity: 0, scale: 0.84 },
  animate: { opacity: 1, scale: 1, transition: IN },
  exit: { opacity: 0, scale: 1.12, transition: OUT },
};

/** Reduced motion: the same tree (so hydration agrees), cut in one frame. */
const cut = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

export function ActionIcon({ size = 16, ...props }: IconProps) {
  const moves = useReducedMotion() ? cut : swap;
  return (
    <span className="center relative shrink-0">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          className="center"
          key={`${props.icon}|${props.className ?? ""}`}
          {...moves}
        >
          <Icon size={size} {...props} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ActionLabel({
  children,
  className = "truncate",
}: {
  children: string;
  className?: string;
}) {
  const moves = useReducedMotion() ? cut : roll;
  return (
    <span className={cn("relative overflow-hidden", className)}>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          className="inline-block whitespace-pre"
          key={shapeOf(children)}
          {...moves}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {pieces(children).map((piece) =>
              piece.digit ? (
                <motion.span
                  className="inline-block tabular-nums"
                  key={`${piece.key}=${piece.text}`}
                  {...moves}
                >
                  {piece.text}
                </motion.span>
              ) : (
                <motion.span key={piece.key}>{piece.text}</motion.span>
              ),
            )}
          </AnimatePresence>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * How long after its own arrival starts the dock reads as landed (ms): it
 * rises 0.382s in and is all but home half a second later (dock.css): the
 * action rises as the dock settles.
 */
const DOCK_LANDS_MS = 382 + 500;
/** Watch for actions this long at most while waiting for the dock. */
const WATCH_MS = 6000;

// Read from the element that runs it when there is one: the document as a
// whole runs hundreds of animations.
const arrivalOf = (root: ParentNode, name: string) =>
  (root instanceof Element ? root.getAnimations() : document.getAnimations())
    .filter(
      (animation): animation is CSSAnimation =>
        animation instanceof CSSAnimation && animation.animationName === name,
    )
    .at(0);

/**
 * Mounted once. On a fresh page the dock rises from below the frame, and
 * an action rising inside it at the same time is lost in that: so while
 * the dock is still arriving, each action that appears waits for it to
 * land (its own animation is held back once, as it starts, never retimed
 * midway). Later actions, in a dock already in place, rise at once.
 */
export function ActionArrival(): null {
  useEffect(() => {
    let landed = false;
    const hold = (action: Element) => {
      if (landed) return;
      const dock = arrivalOf(
        document.querySelector(".dock-root") ?? document,
        "dock-arrive",
      );
      if (dock?.playState === "finished") {
        // Every later action rises at once: nothing left to watch for.
        landed = true;
        watcher.disconnect();
        return;
      }
      const own = arrivalOf(action, "dock-action-arrive");
      const now = Number(document.timeline.currentTime);
      if (!dock || !own) return;
      // Still pending (not started): it starts on this frame.
      const start = dock.startTime === null ? now : Number(dock.startTime);
      const wait = start + DOCK_LANDS_MS - now;
      const { delay = 0 } = own.effect?.getTiming() ?? {};
      if (wait > 0) own.effect?.updateTiming({ delay: wait + Number(delay) });
    };
    const scan = (root: ParentNode) => {
      if (root instanceof Element && root.matches(".dock-action")) hold(root);
      root.querySelectorAll(".dock-action").forEach(hold);
    };
    const watcher = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) scan(node);
        }
      }
    });
    scan(document);
    if (!landed) {
      watcher.observe(document.body, { childList: true, subtree: true });
    }
    const timer = window.setTimeout(() => watcher.disconnect(), WATCH_MS);
    return () => {
      window.clearTimeout(timer);
      watcher.disconnect();
    };
  }, []);
  return null;
}
