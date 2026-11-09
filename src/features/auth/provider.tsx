"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { DOCK_EVENTS } from "@omerdlw/base-framework/modules/dock";
import { useAccount } from "@/features/account/provider";
import {
  clearLastKnownAccount,
  saveLastKnownAccount,
  signedInStatus,
} from "@/features/account/utils";
import { isSupabaseConfigured } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { signOut as signOutClient } from "./client";
import { INITIAL_AUTH_STATE, STATUS_DURATION_MS } from "./constants";
import type { AuthContextValue, AuthState, SignOutScope } from "./types";
import { authStateFrom } from "./utils";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<AuthState>(() => ({
    ...INITIAL_AUTH_STATE,
    isConfigured: configured,
    isReady: !configured,
  }));
  const client = useMemo(
    () => (configured ? createBrowserSupabaseClient() : null),
    [configured],
  );

  const refresh = useCallback(async (): Promise<AuthState | null> => {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    const next = authStateFrom(data.session);
    setState(next);
    return next;
  }, [client]);

  const signOut = useCallback(
    async (scope: SignOutScope = "local") => {
      if (!client) return;
      await signOutClient(client, scope);
      if (scope !== "others") {
        setState({ ...INITIAL_AUTH_STATE, isConfigured: true, isReady: true });
      }
    },
    [client],
  );

  useEffect(() => {
    if (!client) return;
    let active = true;

    refresh().catch((error: unknown) => {
      if (active) setState((current) => ({ ...current, error, isReady: true }));
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) setState(authStateFrom(session));
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, client, refresh, signOut }),
    [client, refresh, signOut, state],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function takeOAuthReturnFlag(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get("auth") !== "login") return false;
  url.searchParams.delete("auth");
  window.history.replaceState(null, "", url.toString());
  return true;
}

export function AuthListener(): null {
  const auth = useAuth();
  const { account: currentAccount } = useAccount();
  const lastAccount = useRef(currentAccount);
  const resolved = useRef(false);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentAccount) return;
    lastAccount.current = currentAccount;
    saveLastKnownAccount(currentAccount);
  }, [currentAccount]);

  useEffect(() => {
    if (!auth.isReady) return;
    const userId = auth.user?.id ?? null;
    const returnedFromOAuth = takeOAuthReturnFlag();
    const settled = resolved.current;

    if (
      userId &&
      (returnedFromOAuth || (settled && previousUserId.current !== userId))
    ) {
      const details = signedInStatus({
        account: currentAccount || lastAccount.current,
        user: auth.user,
      });
      globalEvents.emit(DOCK_EVENTS.STATUS_SET, {
        ...details,
        duration: STATUS_DURATION_MS,
        type: "LOGIN",
      });
    } else if (settled && !userId && previousUserId.current) {
      clearLastKnownAccount();
      globalEvents.emit(DOCK_EVENTS.STATUS_SET, {
        description: "See you soon",
        duration: STATUS_DURATION_MS,
        icon: "solar:logout-2-bold",
        title: "Signed out",
        type: "LOGOUT",
      });
    }

    resolved.current = true;
    previousUserId.current = userId;
  }, [auth.isReady, auth.user, currentAccount]);

  return null;
}
