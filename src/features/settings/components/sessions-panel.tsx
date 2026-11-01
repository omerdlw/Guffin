"use client";

import { useState } from "react";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@/ui/cn";
import { requestJson } from "@/infrastructure/http/client";
import { Button, Icon } from "@/ui";
import { describeDevice, describeSession } from "../session-format";
import { useSecurityTask, useSubmitClass } from "./form";
import type { AuthSession } from "../hooks";

function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1].map((index) => (
        <div
          className="flex h-[52px] w-full items-center justify-between gap-3 rounded-card bg-fill p-1.5 pl-4"
          key={index}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-5 shrink-0 rounded-full bg-fill-hover" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-32 rounded-full bg-fill-hover" />
              <div className="h-2.5 w-44 rounded-full bg-fill-hover" />
            </div>
          </div>
          <div className="h-10 w-20 shrink-0 rounded-inset bg-fill-hover" />
        </div>
      ))}
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
  const submitClass = useSubmitClass();
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
    <div className="flex flex-col gap-2.5">
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-card bg-fill p-6 text-center">
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
        sessions.map((session) => {
          const device = describeDevice(session.user_agent);
          return (
            <div
              className={cn(
                "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-card p-1.5 pl-4 ring-1 ring-inset",
                session.is_current
                  ? "bg-grade/15 ring-grade/25"
                  : "bg-fill ring-edge hover:bg-fill-hover",
              )}
              key={session.session_id}
              title={session.user_agent ?? undefined}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon
                  className={cn(
                    "shrink-0",
                    session.is_current ? "text-grade" : "text-ink-body",
                  )}
                  icon={device.icon}
                  size={20}
                />
                <div className="flex min-w-0 flex-col justify-center gap-0.5">
                  <span className="truncate type-body font-semibold text-ink">
                    {device.title}
                  </span>
                  <span className="truncate type-meta text-ink-muted">
                    {describeSession(session)}
                  </span>
                </div>
              </div>
              {session.is_current ? (
                <span
                  className={cn(
                    "center h-10 shrink-0 rounded-inset px-4 type-meta font-medium",
                    ACTION_TONE_CLASS,
                  )}
                >
                  Current
                </span>
              ) : (
                <Button
                  className={cn(
                    "center h-10 shrink-0 cursor-pointer rounded-inset px-4 type-meta font-medium",
                    ACTION_TONE_CLASS,
                  )}
                  disabled={busyId === session.session_id}
                  loading={busyId === session.session_id}
                  onClick={() => revoke(session.session_id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          );
        })
      )}

      {sessions.some((session) => !session.is_current) ? (
        <Button
          className={cn(
            submitClass,
            "mt-0.5 flex items-center justify-center gap-2",
          )}
          disabled={revokingOthers}
          loading={revokingOthers}
          onClick={revokeOthers}
        >
          <Icon icon="solar:logout-2-bold" size={16} />
          <span>Sign out other sessions</span>
        </Button>
      ) : null}
    </div>
  );
}
