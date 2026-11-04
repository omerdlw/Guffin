"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import type { PasskeyListItem, UserIdentity } from "@supabase/supabase-js";
import { getUserIdentities, listPasskeys } from "@/features/auth/client";
import { useAuth } from "@/features/auth/provider";
import { getAuthErrorMessage } from "@/features/auth/utils";
import { requestJson } from "@/lib/http";
import { cn } from "@/ui/cn";
import { Icon } from "@/ui/media";
import { MARK_TONE_CLASS } from "./constants";
import type { AuthSession, MarkTone } from "./types";
import { SURFACE_TILE_INNER } from "@/ui/tokens";

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
