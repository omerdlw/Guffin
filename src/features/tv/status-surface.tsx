"use client";

import { type JSX, useState } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import { Button, Spinner } from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { TextButton } from "@/design/components/link";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import {
  CHOICE_BODY,
  choiceVariants,
  SURFACE_STACK,
} from "@/design/components/surface-classes";
import { defineSurface } from "@/design/surface-definition";
import { setShowStatusAction } from "./actions";
import { SHOW_STATUS_ICONS, SHOW_STATUS_LABELS, type ShowStatus } from "./show";
import { announceShowChange, useShowStatus } from "./status";

const SHOW_STATUS_ORDER = [
  "watching",
  "paused",
  "completed",
  "dropped",
] as const;

const SHOW_STATUS_DETAILS = Object.freeze({
  watching: "Tick episodes as you go; new ones join your queue",
  paused: "Keep your place and step away for a while",
  completed: "Every aired episode marked watched",
  dropped: "Stop following it; what you watched stays",
} as const);

export const showStatusSurface = defineSurface<{
  data: {
    showId: number;
    title: string;
  };
}>({
  component: ShowStatusSurface,
  description: ({ data }) => `Where you are with ${data.title}`,
  icon: SHOW_STATUS_ICONS.watching,
  title: "Your status",
});

function StatusChoice({
  chosen,
  disabled,
  onChoose,
  pending,
  status,
}: {
  chosen: boolean;
  disabled: boolean;
  onChoose: () => void;
  pending: boolean;
  status: ShowStatus;
}): JSX.Element {
  return (
    <Button
      aria-describedby={chosen ? "show-status-detail" : undefined}
      aria-busy={pending || undefined}
      aria-pressed={chosen}
      className={choiceVariants({ chosen })}
      disabled={disabled}
      onClick={onChoose}
    >
      <span className={CHOICE_BODY}>
        <span className="flex w-full items-center justify-between">
          <Icon icon={SHOW_STATUS_ICONS[status]} size={24} />
          {pending ? (
            <Spinner size={16} />
          ) : chosen ? (
            <Icon icon="solar:check-circle-bold" size={18} />
          ) : null}
        </span>
        <span className="type-body font-semibold">
          {SHOW_STATUS_LABELS[status]}
        </span>
      </span>
    </Button>
  );
}

function ShowStatusSurface({
  data,
}: {
  data: { showId: number; title: string };
}): JSX.Element {
  const toast = useToast();
  const router = useRouter();
  const { loaded, set, status } = useShowStatus(data.showId);
  const [pending, setPending] = useState<ShowStatus | "stop" | null>(null);

  const choose = async (next: ShowStatus | null) => {
    if (pending || next === status) return;
    const before = status;
    setPending(next ?? "stop");
    set(next);
    try {
      const result = await setShowStatusAction(data.showId, next);
      if (!result.success) {
        set(before);
        toast(result.error);
        return;
      }
      const saved = result.progress?.status ?? null;
      set(saved);
      announceShowChange({ showId: data.showId, status: saved });
      router.refresh();
    } catch (error) {
      report("Show status write", error);
      set(before);
      toast(toUserMessage(error, { fallback: "Could not update this show" }));
    } finally {
      setPending(null);
    }
  };

  return (
    <SurfaceStage>
      <div className={SURFACE_STACK}>
        <SurfaceSwap cue="rows" id="statuses" now>
          <div className="grid grid-cols-2 gap-2.5">
            {SHOW_STATUS_ORDER.map((item, index) => (
              <SurfacePart index={index} key={item} name="row">
                <StatusChoice
                  chosen={loaded && status === item}
                  disabled={!loaded || pending === item}
                  onChoose={() => void choose(item)}
                  pending={pending === item}
                  status={item}
                />
              </SurfacePart>
            ))}
          </div>
        </SurfaceSwap>
        <SurfacePart
          className="flex min-h-control-md items-center justify-between gap-4 pr-1 pl-2"
          name="note"
        >
          <p
            className="min-w-0 type-meta text-ink-muted text-pretty"
            id="show-status-detail"
          >
            {status
              ? SHOW_STATUS_DETAILS[status]
              : "Pick one to start following this show"}
          </p>
          {status ? (
            <TextButton
              className="shrink-0"
              disabled={pending !== null}
              onClick={() => void choose(null)}
            >
              {pending === "stop" ? "Stopping…" : "Stop tracking"}
            </TextButton>
          ) : null}
        </SurfacePart>
      </div>
    </SurfaceStage>
  );
}
