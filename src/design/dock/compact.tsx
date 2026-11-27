"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useDockActions, useDockSelector } from "@omerdlw/base-framework/dock";
import { useCompactLens } from "@/design/dock/compact-lens";
import { useEngine } from "@/motion/core/provider";

// Near the top of a page the dock stays a full card: it introduces the page.
const CARD_ZONE = 160;

// Scroll travel in one direction that counts as intent: down shrinks the
// dock to its compact layout, up brings the card back.
const INTENT = 24;

// Parts of the app that need the full card while they are open (search
// typing in the card's action, say) hold it; compact waits until none do.
const holds = new Set<symbol>();
const listeners = new Set<() => void>();

function subscribeHolds(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const isHeld = () => holds.size > 0;

// Parts that need the compact row to stay while they are open (search open
// in place in it): scroll leaves the layout alone until none do.
const rowHolds = new Set<symbol>();
const isHeldOnServer = () => false;

function notifyHolds() {
  for (const listener of listeners) listener();
}

/** Keeps the dock a full card while `active`, whatever the scroll. */
export function useKeepDockCard(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const hold = Symbol("dock-card-hold");
    holds.add(hold);
    notifyHolds();
    return () => {
      holds.delete(hold);
      notifyHolds();
    };
  }, [active]);
}

/** Keeps the dock compact (if it is) while `active`, whatever the scroll. */
export function useHoldDockCompact(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const hold = Symbol("dock-compact-hold");
    rowHolds.add(hold);
    return () => {
      rowHolds.delete(hold);
    };
  }, [active]);
}

/**
 * Drives the dock's compact layout from scroll, the way a browser toolbar
 * hides: reading down shrinks the dock to its commands, scrolling back up (or
 * tapping the dock) restores the card. Reads `engine.scroll` only, so
 * scrolling never measures the page.
 */
export function DockCompact(): null {
  const engine = useEngine();
  const { setCompact } = useDockActions();
  const compact = useDockSelector((state) => state.compact);
  const held = useSyncExternalStore(subscribeHolds, isHeld, isHeldOnServer);
  const shown = useRef({ anchor: 0, compact: false, held: false });
  useCompactLens();

  // The dock may leave the compact layout on its own (a tap, a command): turn
  // there so the next scroll measures from where the reader is.
  useEffect(() => {
    if (shown.current.compact === compact) return;
    shown.current = { ...shown.current, anchor: engine.scroll.get(), compact };
  }, [compact, engine]);

  // A hold opens the card now; when it lets go, scroll counts from here.
  useEffect(() => {
    shown.current = {
      anchor: engine.scroll.get(),
      compact: held ? false : shown.current.compact,
      held,
    };
    if (held) setCompact(false);
  }, [engine, held, setCompact]);

  useEffect(() => {
    const show = (next: boolean, y: number) => {
      shown.current = { ...shown.current, anchor: y, compact: next };
      setCompact(next);
    };
    shown.current.anchor = engine.scroll.get();
    return engine.scroll.subscribe((y) => {
      const { anchor, compact: current, held: isHolding } = shown.current;
      if (isHolding) return;
      if (rowHolds.size > 0) {
        shown.current.anchor = y;
        return;
      }
      if (y <= CARD_ZONE) {
        if (current) show(false, y);
        else shown.current.anchor = Math.min(anchor, y);
        return;
      }
      if (current) {
        if (y > anchor) shown.current.anchor = y;
        else if (anchor - y > INTENT) show(false, y);
        return;
      }
      if (y < anchor) shown.current.anchor = y;
      else if (y - anchor > INTENT) show(true, y);
    });
  }, [engine, setCompact]);

  return null;
}
