"use client";

import { type JSX, useCallback, useEffect, useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { report } from "@omerdlw/base-framework/utils";
import { useSurfacePreload } from "@/design/lazy-surface";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { DetailAction } from "@/features/detail/stage";
import { getShowTrackingAction } from "./actions";
import {
  SHOW_EVENTS,
  SHOW_STATUS_ICONS,
  SHOW_STATUS_LABELS,
  type ShowStatus,
} from "./show";
import { showStatusSurface } from "./surfaces";

export function announceShowChange(change: ShowChange): void {
  globalEvents.emit(SHOW_EVENTS.CHANGE, change);
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
  useSurfacePreload(showStatusSurface);
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
        else
          void showStatusSurface.open(openSurface, { data: { showId, title } });
      }}
      secondary={secondary}
      shortLabel={secondary ? label : undefined}
    />
  );
}

export const SHOW_TRACK_ICON = "solar:play-circle-linear";

export interface ShowChange {
  showId: number;
  status?: ShowStatus | null;
}

export function useShowStatus(showId: number) {
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
