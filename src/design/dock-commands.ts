"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  type DockActionDescriptor,
  useDockContextActions,
} from "@omerdlw/base-framework/dock";

// The dock's command row, with one extra: a command can take the whole row
// over for a moment (the theme command turns it into its picker). While one
// owner holds it, every other command steps out of the row.

let owner: string | null = null;

const listeners = new Set<() => void>();

export function takeOverDockCommands(next: string | null) {
  if (owner === next) return;
  owner = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read() {
  return owner;
}

export function useDockCommandOwner(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function useDockCommands(
  actions: Partial<DockActionDescriptor>[],
  self?: string,
) {
  const current = useDockCommandOwner();
  // `visible` is always written out: the dock merges a re-registered command
  // field by field, so a command without the field would stay hidden.
  const shown = useMemo(() => {
    const hidden = current !== null && current !== self;
    return actions.map((action) => ({
      ...action,
      visible: hidden ? false : (action.visible ?? true),
    }));
  }, [actions, current, self]);
  useDockContextActions(shown);
}
