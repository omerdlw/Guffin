"use client";

import { useEffect } from "react";

// Where the dock's icon commands sit: the compact row, and the card's
// command bar. Hover is one fill that slides between commands in a group,
// not a separate fill per command.
const GROUP = ".dock-compact, .dock-commands";
const TARGET = ".dock-command";
const OFF = ":disabled, [aria-disabled='true']";
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

const HOVER_CLASS = "pointer-events-none absolute left-0 top-0 rounded-full";

/**
 * The dock's sliding hover fill. Listens on the document, so it needs no
 * hook into the dock; reads geometry only when the pointer moves onto a
 * command, never per frame or on scroll.
 */
export function useDockHover(): void {
  useEffect(() => {
    const fine = matchMedia(FINE_POINTER);
    let group: HTMLElement | null = null;
    let fill: HTMLElement | null = null;
    let shown = false;

    const attach = (next: HTMLElement) => {
      if (fill?.isConnected && group === next) return fill;
      fill?.remove();
      group = next;
      shown = false;
      fill = document.createElement("span");
      fill.className = HOVER_CLASS;
      fill.setAttribute("aria-hidden", "true");
      fill.dataset.part = "dock-hover";
      fill.dataset.shown = "false";
      next.prepend(fill);
      return fill;
    };

    const onOver = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType === "touch") return;
      const control = (event.target as Element | null)?.closest<HTMLElement>(
        TARGET,
      );
      const next = control?.closest<HTMLElement>(GROUP);
      if (!control || !next || control.matches(OFF)) return;
      const element = attach(next);
      const frame = next.getBoundingClientRect();
      const box = control.getBoundingClientRect();
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.style.translate = `${box.left - frame.left}px ${box.top - frame.top}px`;
      if (shown) return;
      // First arrival lands in place; only later moves glide.
      shown = true;
      element.dataset.shown = "landing";
      requestAnimationFrame(() => {
        if (shown) element.dataset.shown = "true";
      });
    };

    const onOut = (event: PointerEvent) => {
      if (!fill || !group) return;
      const to = event.relatedTarget as Element | null;
      if (to?.closest?.(TARGET) && group.contains(to)) return;
      shown = false;
      fill.dataset.shown = "false";
    };

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    return () => {
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      fill?.remove();
    };
  }, []);
}
