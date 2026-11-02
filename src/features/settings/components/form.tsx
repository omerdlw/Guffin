"use client";

import { useToast } from "@omerdlw/base-framework/modules/notification";
import { getAuthErrorMessage } from "@/features/auth";
import { cn } from "@/ui/cn";
import { Icon, SURFACE_FIELD, SURFACE_PRIMARY, SURFACE_TILE_INNER } from "@/ui";

const FIELD_CLASS = `${SURFACE_FIELD} w-full resize-none type-body`;

export const INPUT_CLASS = `${FIELD_CLASS} h-10 px-4`;
export const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-36 p-4`;

export const SUBMIT_CLASS = `${SURFACE_PRIMARY} w-full`;

export const rowAction = (icon = false) =>
  cn(
    "center relative inline-flex shrink-0 cursor-pointer items-center justify-center type-control font-medium text-ink-body outline-none select-none hover:bg-fill-hover hover:text-ink focus-visible:bg-fill-hover focus-visible:text-ink disabled:pointer-events-none disabled:opacity-50",
    SURFACE_TILE_INNER,
    icon ? "size-9" : "h-10 bg-fill px-4",
  );

type MarkTone = "danger" | "lit" | "plain";

const MARK_TONE: Record<MarkTone, string> = {
  danger: "bg-danger/15 text-danger",
  lit: "bg-grade/15 text-grade",
  plain:
    "bg-fill text-ink-body group-hover:bg-fill-hover group-focus-visible:bg-fill-hover group-has-focus-visible:bg-fill-hover group-hover:text-ink group-focus-visible:text-ink group-has-focus-visible:text-ink",
};

export function Mark({
  icon,
  size = 20,
  tone = "plain",
}: {
  icon: string;
  size?: number;
  tone?: MarkTone;
}) {
  return (
    <span
      className={cn(
        "center size-10 shrink-0",
        SURFACE_TILE_INNER,
        MARK_TONE[tone],
      )}
    >
      <Icon className="ui-glyph center" icon={icon} size={size} />
    </span>
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
