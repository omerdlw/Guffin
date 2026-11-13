"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import type { PasskeyListItem, UserIdentity } from "@supabase/supabase-js";
import { Icon } from "@/design/components/icon";
import {
  SURFACE_PANEL,
  SURFACE_STACK,
  SURFACE_TILE_INNER,
  tileVariants,
} from "@/design/components/surface-classes";
import { cn } from "@/design/ui";
import { getUserIdentities, listPasskeys } from "@/features/auth/client";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { useAuth } from "@/features/auth/provider";
import { requestJson } from "@/lib/http";
import type { AuthSession } from "./settings";

type MarkTone = "danger" | "lit" | "plain";

const MARK_TONE_CLASS: Record<MarkTone, string> = {
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

export function PanelSkeleton({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className={SURFACE_STACK}>
      {[0, 1].map((index) => (
        <div className={cn(tileVariants(), "h-[52px] pr-1.5")} key={index}>
          <div className="size-10 shrink-0 rounded-inset bg-fill-hover" />
          {detailed ? (
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3.5 w-28 rounded-full bg-fill-hover" />
              <div className="h-2.5 w-40 rounded-full bg-fill-hover" />
            </div>
          ) : (
            <div className="h-3.5 w-28 flex-1 rounded-full bg-fill-hover" />
          )}
          <div
            className={cn(
              "shrink-0 rounded-inset bg-fill-hover",
              detailed ? "h-10 w-20" : "size-10",
            )}
          />
        </div>
      ))}
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
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [identities, setIdentities] = useState<UserIdentity[]>(
    () => auth.user?.identities ?? [],
  );
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const client = auth.client;
    if (!client || !auth.isAuthenticated) return;
    setLoading(true);
    try {
      const [sessionList, passkeyList, identityList] = await Promise.all([
        requestJson<{ sessions: AuthSession[] }>("/api/auth/sessions", {
          notifyOnUnauthorized: false,
        }),
        listPasskeys(client).catch(() => []),
        getUserIdentities(client).catch(() => auth.user?.identities ?? []),
      ]);
      setSessions(sessionList.sessions);
      setPasskeys(passkeyList);
      setIdentities(identityList);
    } finally {
      setLoading(false);
    }
  }, [auth.client, auth.isAuthenticated, auth.user?.identities]);

  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => void reload());
    return () => cancelAnimationFrame(frame);
  }, [enabled, reload]);

  return { identities, loading, passkeys, reload, sessions };
}
