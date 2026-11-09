"use client";

import { useEffect, useState, useTransition } from "react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";

/** A two-step confirm: the first press arms, the state disarms itself. */
export function useConfirmStep(
  resetMs = 3000,
): [confirming: boolean, setConfirming: (value: boolean) => void] {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), resetMs);
    return () => window.clearTimeout(timer);
  }, [confirming, resetMs]);

  return [confirming, setConfirming];
}

/**
 * A destructive action behind a two-step confirm. `confirmThen` arms on the
 * first call and runs the work on the second; a failure is reported and
 * toasted with `fallback`.
 */
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
  const [confirming, setConfirming] = useConfirmStep();
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
      setConfirming(false);
    });

  const confirmThen = (work: Parameters<typeof run>[0]) => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    run(work);
  };

  return { busy, confirming, confirmThen, run };
}
