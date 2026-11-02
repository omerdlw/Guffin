"use client";

import { useState } from "react";
import { cn } from "@/ui/cn";
import { requestJson } from "@/infrastructure/http/client";
import {
  Button,
  HighlightGroup,
  SURFACE_TEXT,
  Icon,
  SURFACE_META,
  SURFACE_PANEL,
  SURFACE_STACK,
  SURFACE_TILE,
  SURFACE_TITLE,
  useHighlight,
} from "@/ui";
import { describeDevice, describeSession } from "../session-format";
import { Mark, rowAction, SUBMIT_CLASS, useSecurityTask } from "./form";
import type { AuthSession } from "../hooks";

function SessionsSkeleton() {
  return (
    <div className={SURFACE_STACK}>
      {[0, 1].map((index) => (
        <div className={cn(SURFACE_TILE, "h-[52px] pr-1.5")} key={index}>
          <div className="size-10 shrink-0 rounded-inset bg-fill-hover" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-28 rounded-full bg-fill-hover" />
            <div className="h-2.5 w-40 rounded-full bg-fill-hover" />
          </div>
          <div className="h-10 w-20 shrink-0 rounded-inset bg-fill-hover" />
        </div>
      ))}
    </div>
  );
}

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
      className={cn(SURFACE_TILE, "relative isolate")}
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
          className={rowAction()}
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

  if (loading && sessions.length === 0) return <SessionsSkeleton />;

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
        <div
          className={cn(
            SURFACE_PANEL,
            "flex flex-col items-center gap-2 p-6 text-center",
          )}
        >
          <Icon
            className="text-ink-muted"
            icon="solar:devices-bold"
            size={22}
          />
          <span className="type-meta font-medium text-ink-muted">
            No active sessions found
          </span>
        </div>
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
          className={SUBMIT_CLASS}
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
