"use client";

import { useState } from "react";
import { requestJson } from "@/lib/http";
import {
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface-classes";
import { cn } from "@/design/ui";
import { Mark, PanelNotice, PanelSkeleton, useSecurityTask } from "./shared";
import type { AuthSession } from "./types";
import { describeDevice, describeSession } from "./utils";

function SessionRow({
  busy,
  disabled,
  onRevoke,
  session,
}: {
  busy: boolean;
  disabled: boolean;
  onRevoke: () => void;
  session: AuthSession;
}) {
  const highlight = useHighlight(session.session_id);
  const device = describeDevice(session.user_agent);
  return (
    <div
      className={cn(tileVariants(), "relative isolate")}
      title={session.user_agent ?? undefined}
      {...highlight.props}
    >
      {highlight.node}
      <Mark icon={device.icon} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{device.title}</span>
        <span className={SURFACE_META}>{describeSession(session)}</span>
      </span>
      {session.is_current ? (
        <span className="flex shrink-0 items-center gap-2 px-3 type-meta font-medium text-ink-muted">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-ink-body"
          />
          This device
        </span>
      ) : (
        <Button
          className={SURFACE_TILE_INNER}
          intent="neutral"
          disabled={disabled}
          loading={busy}
          onClick={onRevoke}
        >
          Sign out
        </Button>
      )}
    </div>
  );
}

export function SessionsPanel({
  loading,
  reload,
  sessions,
}: {
  loading: boolean;
  reload: () => Promise<void>;
  sessions: AuthSession[];
}) {
  const run = useSecurityTask(reload);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  if (loading && sessions.length === 0) return <PanelSkeleton detailed />;

  const revoke = (sessionId: string) =>
    run(
      () =>
        requestJson(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
        }),
      (busy) => setBusyId(busy ? sessionId : null),
      "Device signed out",
      "Couldn't sign out that device",
    );

  const revokeOthers = () =>
    run(
      () => requestJson("/api/auth/sessions/others", { method: "POST" }),
      setRevokingOthers,
      "Signed out of your other devices",
      "Couldn't sign out your other devices",
    );

  return (
    <HighlightGroup className={SURFACE_STACK}>
      {sessions.length === 0 ? (
        <PanelNotice
          icon="solar:devices-bold"
          text="No active sessions found"
        />
      ) : (
        sessions.map((session) => (
          <SessionRow
            busy={busyId === session.session_id}
            disabled={busyId !== null || revokingOthers}
            key={session.session_id}
            onRevoke={() => revoke(session.session_id)}
            session={session}
          />
        ))
      )}

      {sessions.some((session) => !session.is_current) ? (
        <Button
          intent="primary"
          width="full"
          disabled={revokingOthers || busyId !== null}
          loading={revokingOthers}
          onClick={revokeOthers}
        >
          <Icon icon="solar:logout-2-bold" size={16} />
          Sign out all other devices
        </Button>
      ) : null}
    </HighlightGroup>
  );
}
