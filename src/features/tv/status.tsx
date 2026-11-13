"use client";

import { type JSX, useCallback, useEffect, useState } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  type SurfaceEntry,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { DetailAction } from "@/features/detail/stage";
import { Button } from "@/design/components/button";
import {
  HighlightGroup,
  useHighlight,
} from "@/design/components/highlight-group";
import { CheckboxIndicator } from "@/design/components/checkbox";
import { Icon } from "@/design/components/icon";
import {
  rowVariants,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import { getShowTrackingAction, setShowStatusAction } from "./actions";
import {
  SHOW_EVENTS,
  SHOW_STATUS_DETAILS,
  SHOW_STATUS_ICONS,
  SHOW_STATUS_LABELS,
  SHOW_STATUS_ORDER,
  SHOW_TRACK_ICON,
} from "./constants";
import type { ShowStatus } from "./types";

export interface ShowChange {
  showId: number;
  status?: ShowStatus | null;
}

export function announceShowChange(change: ShowChange): void {
  globalEvents.emit(SHOW_EVENTS.CHANGE, change);
}

function useShowStatus(showId: number) {
  const auth = useAuth();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ? `${userId}:${showId}` : null;
  const [state, setState] = useState<{
    key: string;
    status: ShowStatus | null;
  } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    getShowTrackingAction(showId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setState({ key, status: result.tracking?.progress?.status ?? null });
        } else report("Show status load", result.error);
      })
      .catch((error) => report("Show status load", error));
    return () => {
      cancelled = true;
    };
  }, [key, showId, version]);

  useGlobalEvent<ShowChange>(key ? SHOW_EVENTS.CHANGE : null, (change) => {
    if (!key || change.showId !== showId) return;
    if (change.status !== undefined) setState({ key, status: change.status });
    else setVersion((current) => current + 1);
  });

  const loaded = key === null || state?.key === key;
  const status = state?.key === key ? state.status : null;
  const set = useCallback(
    (next: ShowStatus | null) => key && setState({ key, status: next }),
    [key],
  );
  return { key, loaded, ready: auth.isReady, set, status };
}

export function createShowStatusSurfaceEntry(data: {
  showId: number;
  title: string;
}): SurfaceEntry {
  return {
    component: ShowStatusSurface,
    description: `Where you are with ${data.title}`,
    icon: SHOW_STATUS_ICONS.watching,
    props: { data },
    title: "Your status",
  };
}

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

export function ShowStatusAction({
  secondary = false,
  showId,
  title,
}: {
  secondary?: boolean;
  showId: number;
  title: string;
}): JSX.Element {
  const { openSurface } = useDockActions();
  const openSignIn = useOpenSignIn();
  const { key, loaded, ready, status } = useShowStatus(showId);
  const label = status ? SHOW_STATUS_LABELS[status] : "Track";

  return (
    <DetailAction
      active={status !== null}
      disabled={!ready || !loaded}
      grow
      icon={{
        off: SHOW_TRACK_ICON,
        on: status ? SHOW_STATUS_ICONS[status] : SHOW_TRACK_ICON,
      }}
      label={secondary ? "Your status" : label}
      onClick={() => {
        if (!key) openSignIn();
        else void openSurface(createShowStatusSurfaceEntry({ showId, title }));
      }}
      secondary={secondary}
      shortLabel={secondary ? label : undefined}
    />
  );
}
