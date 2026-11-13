"use client";

import { useCallback, useTransition } from "react";
import {
  DOCK_HUD_PRIORITY,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { Button } from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { cn } from "@/design/ui";
import { Icon } from "./icon";

export interface ConfirmOptions {
  action?: string;
  description?: string;
  icon?: string;
  title: string;
  tone?: "danger" | "neutral";
}

export function ConfirmHud({
  action = "Delete",
  description,
  icon = "solar:trash-bin-trash-bold",
  onAnswer,
  title,
  tone = "danger",
}: ConfirmOptions & { onAnswer: (yes: boolean) => void }) {
  return (
    <div
      aria-describedby={description ? "confirm-hud-description" : undefined}
      aria-labelledby="confirm-hud-title"
      className="flex w-full items-center gap-3 p-1.5"
      onClick={(event) => event.stopPropagation()}
      role="alertdialog"
    >
      <span
        className={cn(
          "center size-9 shrink-0 rounded-inset",
          tone === "danger"
            ? "bg-danger/15 text-danger"
            : "bg-fill text-ink-body",
        )}
      >
        <Icon className="ui-glyph center" icon={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span
          className="truncate type-body font-semibold text-ink"
          id="confirm-hud-title"
        >
          {title}
        </span>
        {description ? (
          <span
            className="truncate type-meta text-ink-muted"
            id="confirm-hud-description"
          >
            {description}
          </span>
        ) : null}
      </span>
      <div className="flex shrink-0 gap-1.5">
        <Button
          intent="neutral"
          shape="thumb"
          size="sm"
          onClick={() => onAnswer(false)}
        >
          Cancel
        </Button>
        <Button
          autoFocus
          intent={tone === "danger" ? "danger" : "primary"}
          shape="thumb"
          size="sm"
          onClick={() => onAnswer(true)}
        >
          {action}
        </Button>
      </div>
    </div>
  );
}

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
