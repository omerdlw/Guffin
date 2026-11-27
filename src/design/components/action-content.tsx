"use client";

import { type ReactElement, useEffect } from "react";
import { useDockSelector } from "@omerdlw/base-framework/dock";
import { Tooltip } from "@omerdlw/base-framework/ui";
import { pieces, shapeOf } from "@/design/components/action-text";
import { Icon, type IconProps } from "@/design/components/icon";
import { DOCK_TOOLTIP } from "@/design/theme/dock";
import { cn } from "@/design/ui";
import { AnimatePresence, motion, useReducedMotion } from "@/motion/lib";
import { LEAVE, SETTLE } from "@/motion/choreography/pace";

const IN = { duration: 0.382, ease: SETTLE };
const OUT = { duration: 0.236, ease: LEAVE };
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

/**
 * A card action that is not the first: the compact row draws it as its icon
 * alone, so there it names itself in the dock's tooltip.
 */
export function ActionTip({
  children,
  text,
}: {
  children: ReactElement;
  text: string;
}) {
  const compact = useDockSelector((state) => state.compact && !state.expanded);
  return (
    <Tooltip
      className={DOCK_TOOLTIP}
      sideOffset={6}
      text={compact ? text : undefined}
    >
      {children}
    </Tooltip>
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
    <span
      className={cn("relative overflow-hidden", className)}
      data-part="action-label"
    >
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

const DOCK_LANDS_MS = 382 + 500;
const WATCH_MS = 6000;

const arrivalOf = (root: ParentNode, name: string) =>
  (root instanceof Element ? root.getAnimations() : document.getAnimations())
    .filter(
      (animation): animation is CSSAnimation =>
        animation instanceof CSSAnimation && animation.animationName === name,
    )
    .at(0);

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
        landed = true;
        watcher.disconnect();
        return;
      }
      const own = arrivalOf(action, "dock-action-arrive");
      const now = Number(document.timeline.currentTime);
      if (!dock || !own) return;
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
