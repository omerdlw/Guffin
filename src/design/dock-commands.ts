"use client";

import { useMemo } from "react";
import {
  type DockActionDescriptor,
  useDockContextActions,
} from "@omerdlw/base-framework/dock";

export function useDockCommands(actions: Partial<DockActionDescriptor>[]) {
  const shown = useMemo(
    () =>
      actions.map((action) => ({
        ...action,
        visible: action.visible ?? true,
      })),
    [actions],
  );
  useDockContextActions(shown);
}
