"use client";

import { useState } from "react";
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
import { requestJson } from "@/lib/http";
import { Mark, PanelNotice, PanelSkeleton, useSecurityTask } from "./panel";
import type { AuthSession } from "./settings";

const DEVICE_PATTERNS: [RegExp, string, "desktop" | "mobile" | "tablet"][] = [
  [/iPhone/i, "iPhone", "mobile"],
  [/iPad/i, "iPad", "tablet"],
  [/Android.*Mobile/i, "Android", "mobile"],
  [/Android/i, "Android tablet", "tablet"],
  [/Macintosh|Mac OS X/i, "macOS", "desktop"],
  [/Windows/i, "Windows", "desktop"],
  [/CrOS/i, "Chromebook", "desktop"],
  [/Linux/i, "Linux", "desktop"],
];

const DEVICE_ICONS: Readonly<Record<string, string>> = {
  mobile: "solar:smartphone-bold",
  tablet: "solar:tablet-bold",
};

const BROWSER_PATTERNS: [(userAgent: string) => boolean, string][] = [
  [(ua) => /Arc\//i.test(ua), "Arc"],
  [(ua) => /Edg\//i.test(ua), "Edge"],
  [(ua) => /OPR\/|Opera/i.test(ua), "Opera"],
  [(ua) => /Brave/i.test(ua), "Brave"],
  [(ua) => /Vivaldi/i.test(ua), "Vivaldi"],
  [(ua) => /SamsungBrowser/i.test(ua), "Samsung Internet"],
  [(ua) => /CriOS\//i.test(ua), "Chrome"],
  [(ua) => /FxiOS\//i.test(ua), "Firefox"],
  [(ua) => /Chrome\//i.test(ua) && !/Chromium/i.test(ua), "Chrome"],
  [(ua) => /Firefox\//i.test(ua), "Firefox"],
  [
    (ua) =>
      /Version\/[0-9.]+.*Safari/i.test(ua) ||
      (/Safari/i.test(ua) && /Apple/i.test(ua)),
    "Safari",
  ],
];

const LOCALHOST_ADDRESSES = new Set(["::1", "127.0.0.1", "::ffff:127.0.0.1"]);

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

function describeDevice(userAgent: string | null): {
  icon: string;
  title: string;
} {
  if (!userAgent) {
    return { icon: "solar:monitor-smartphone-bold", title: "Unknown session" };
  }
  const [, label, kind] = DEVICE_PATTERNS.find(([pattern]) =>
    pattern.test(userAgent),
  ) ?? [null, "Desktop", "desktop"];
  const browser =
    BROWSER_PATTERNS.find(([matches]) => matches(userAgent))?.[1] ??
    "Web browser";
  const icon =
    DEVICE_ICONS[kind] ??
    (label === "Windows" || label === "Linux"
      ? "solar:monitor-bold"
      : "solar:laptop-minimalistic-bold");
  return { icon, title: `${browser} on ${label}` };
}

function describeActivity(session: AuthSession): string {
  if (session.is_current) return "Active now";
  const value = session.last_seen_at || session.created_at;
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Active session";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Active just now";
  if (seconds < 3600)
    return `Active ${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `Active ${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `Active ${Math.floor(seconds / 86400)}d ago`;
  return `Active ${SHORT_DATE_FORMAT.format(date)}`;
}

function describeSession(session: AuthSession): string {
  const ip = session.ip_address?.trim();
  const place = ip ? (LOCALHOST_ADDRESSES.has(ip) ? "Localhost" : ip) : null;
  return [place, describeActivity(session)].filter(Boolean).join(" • ");
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
