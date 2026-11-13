"use client";

import { type JSX, useState } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  Button,
  CheckboxIndicator,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import {
  rowVariants,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import { defineSurface } from "@/design/surface-definition";
import { cn } from "@/design/ui";
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

function StatusRow({
  chosen,
  onChoose,
  pending,
  status,
}: {
  chosen: boolean;
  onChoose: () => void;
  pending: boolean;
  status: ShowStatus;
}): JSX.Element {
  const highlight = useHighlight(status);
  return (
    <Button
      aria-pressed={chosen}
      className={rowVariants({ intent: chosen ? "chosen" : "neutral" })}
      disabled={pending}
      onClick={onChoose}
      {...highlight.props}
    >
      {highlight.node}
      <span
        className={cn(
          "center relative z-10 size-12 shrink-0",
          SURFACE_TILE_INNER,
          chosen ? "bg-grade/15" : "bg-fill",
        )}
      >
        <Icon icon={SHOW_STATUS_ICONS[status]} size={20} />
      </span>
      <span className={cn(SURFACE_TEXT, "relative z-10")}>
        <span className={SURFACE_TITLE}>{SHOW_STATUS_LABELS[status]}</span>
        <span className={cn(SURFACE_META, "whitespace-normal")}>
          {SHOW_STATUS_DETAILS[status]}
        </span>
      </span>
      <CheckboxIndicator checked={chosen} pending={pending} />
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
          <HighlightGroup className="flex flex-col gap-2.5">
            {SHOW_STATUS_ORDER.map((item, index) => (
              <SurfacePart index={index} key={item} name="row">
                <StatusRow
                  chosen={loaded && status === item}
                  onChoose={() => void choose(item)}
                  pending={pending === item || !loaded}
                  status={item}
                />
              </SurfacePart>
            ))}
          </HighlightGroup>
        </SurfaceSwap>
        {status ? (
          <SurfacePart name="item">
            <Button
              intent="neutral"
              width="full"
              disabled={pending !== null}
              loading={pending === "stop"}
              onClick={() => void choose(null)}
            >
              <Icon icon="solar:close-circle-linear" size={16} />
              Stop tracking
            </Button>
          </SurfacePart>
        ) : null}
      </div>
    </SurfaceStage>
  );
}
