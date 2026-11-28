"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import { Icon } from "@/design/components/icon";
import { SURFACE_PANEL, SURFACE_TILE_INNER } from "@/design/surface/classes";
import { cn } from "@/design/ui";
import {
  getUserIdentities,
  type LinkedIdentity,
  listPasskeys,
  type Passkey,
} from "@/features/auth/api";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { useAuth } from "@/features/auth/provider";
import { requestJson } from "@/shared/http";
import type { AuthSession } from "./model";

type MarkTone = "danger" | "lit" | "plain";

const MARK_TONE_CLASS: Record<MarkTone, string> = {
  danger: "bg-danger/15 text-danger",
  lit: "bg-grade/15 text-grade",
  plain: "bg-fill text-ink-body group-hover:bg-fill-hover group-hover:text-ink",
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
        MARK_TONE_CLASS[tone],
      )}
    >
      <Icon className="ui-glyph center" icon={icon} size={size} />
    </span>
  );
}

export function PanelNotice({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className={cn(
        SURFACE_PANEL,
        "flex flex-col items-center gap-2 p-6 text-center",
      )}
    >
      <Icon className="text-ink-muted" icon={icon} size={22} />
      <span className="type-meta font-medium text-ink-muted">{text}</span>
    </div>
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

export function useSecurity(enabled: boolean) {
  const auth = useAuth();
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    setLoading(true);
    try {
      const [sessionList, passkeyList, identityList] = await Promise.all([
        requestJson<{ sessions: AuthSession[] }>("/api/auth/sessions", {
          notifyOnUnauthorized: false,
        }),
        listPasskeys().catch(() => []),
        getUserIdentities().catch(() => []),
      ]);
      setSessions(sessionList.sessions);
      setPasskeys(passkeyList);
      setIdentities(identityList);
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => void reload());
    return () => cancelAnimationFrame(frame);
  }, [enabled, reload]);

  return { identities, loading, passkeys, reload, sessions };
}
