"use client";

import { useCallback, useTransition } from "react";
import {
  DOCK_HUD_PRIORITY,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { ConfirmHud, type ConfirmOptions } from "../components/confirm";

export type { ConfirmOptions };

let sequence = 0;
let pending: { cancel: () => void } | null = null;

export function useConfirm() {
  const { clearHud, setHud } = useDockActions();
  return useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => {
        pending?.cancel();
        const id = `confirm:${++sequence}`;
        let settled = false;
        const settle = (yes: boolean) => {
          if (settled) return;
          settled = true;
          if (pending === entry) pending = null;
          resolve(yes);
        };
        const entry = {
          cancel: () => {
            settle(false);
            clearHud(id);
          },
        };
        pending = entry;
        const onAnswer = (yes: boolean) => {
          settle(yes);
          clearHud(id);
        };
        setHud({
          component: ConfirmHud,
          dismissOnEscape: true,
          dismissOnNavigate: true,
          id,
          onDismiss: () => settle(false),
          priority: DOCK_HUD_PRIORITY.CRITICAL,
          props: { ...options, onAnswer },
        });
      }),
    [clearHud, setHud],
  );
}

export function useConfirmedAction({
  fallback,
  name,
  onSuccess,
}: {
  fallback: string;
  name: string;
  onSuccess?: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, startTransition] = useTransition();

  const run = (work: () => Promise<{ error?: string; success: boolean }>) =>
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.success) throw new Error(result.error);
        onSuccess?.();
      } catch (error) {
        report(name, error);
        toast(toUserMessage(error, { fallback }));
      }
    });

  const confirmThen = async (
    options: ConfirmOptions,
    work: Parameters<typeof run>[0],
  ) => {
    if (await confirm(options)) run(work);
  };

  return { busy, confirmThen, run };
}
