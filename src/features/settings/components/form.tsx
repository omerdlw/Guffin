"use client";

import { useMemo } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { getAuthErrorMessage } from "@/features/auth";
import { SURFACE_FIELD } from "@/ui";

const FIELD_CLASS = `${SURFACE_FIELD} w-full resize-none type-body`;

export const INPUT_CLASS = `${FIELD_CLASS} h-10 px-4`;
export const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-36 p-4`;

export const ROW_BUTTON_CLASS =
  "center h-8 rounded-tile px-3.5 type-meta font-medium cursor-pointer";

export function useSubmitClass(): string {
  const actionClass = useDockActionClass();
  return useMemo(
    () =>
      actionClass({
        className: "h-10 disabled:cursor-not-allowed disabled:opacity-50",
        variant: ACTION_TONE_CLASS,
      }),
    [actionClass],
  );
}

export function useSecurityTask(reload: () => Promise<void>) {
  const toast = useToast();
  return async (
    task: () => Promise<unknown>,
    setBusy: (busy: boolean) => void,
    success: string,
    failure: string,
  ) => {
    setBusy(true);
    try {
      await task();
      await reload();
      toast(success);
    } catch (error) {
      toast(getAuthErrorMessage(error, failure));
    } finally {
      setBusy(false);
    }
  };
}
