"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { DOCK_EVENTS } from "@omerdlw/base-framework/dock";
import { globalEvents } from "@omerdlw/base-framework/events";
import {
  clearLastKnownAccount,
  saveLastKnownAccount,
  signedInStatus,
} from "@/features/account/model";
import { useAccount } from "@/features/account/provider";
import { authClient } from "@/infrastructure/auth/client";
import { resetRouterCache } from "./actions";
import { signOut as signOutClient, signOutOtherSessions } from "./api";
import type { SignOutScope } from "./model";

export interface AuthUser {
  email: string;
  id: string;
  image: string | null;
  name: string;
}

interface AuthContextValue {
  error: unknown;
  isAuthenticated: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
  sessionCreatedAt: string | null;
  signOut: (scope?: SignOutScope) => Promise<void>;
  user: AuthUser | null;
}

const STATUS_DURATION_MS = 3000;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const { data, error, isPending, refetch } = authClient.useSession();

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const signOut = useCallback(
    async (scope: SignOutScope = "local") => {
      if (scope === "others") {
        await signOutOtherSessions();
        return;
      }
      await signOutClient();
      await refetch();
    },
    [refetch],
  );

  // The session is fetched again whenever the tab regains focus, and each
  // fetch hands back a new `data` object even when nothing changed. Everything
  // below is keyed on the values inside it, so a return to the tab leaves the
  // user, and everything that reads it, exactly as it was.
  const id = data?.user?.id ?? null;
  const email = data?.user?.email ?? "";
  const name = data?.user?.name ?? "";
  const image = data?.user?.image ?? null;
  const created = data?.session
    ? new Date(data.session.createdAt).toISOString()
    : null;

  const user = useMemo<AuthUser | null>(
    () => (id ? { email, id, image, name } : null),
    [email, id, image, name],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isAuthenticated: Boolean(user),
      isReady: !isPending,
      refresh,
      sessionCreatedAt: created,
      signOut,
      user,
    }),
    [created, error, isPending, refresh, signOut, user],
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
        icon: "solar:logout-3-bold",
        title: "Signed out",
        type: "LOGOUT",
      });
    }

    if (settled && previousUserId.current !== userId) {
      void resetRouterCache().catch(() => null);
    }

    resolved.current = true;
    previousUserId.current = userId;
  }, [auth.isReady, auth.user, currentAccount]);

  return null;
}
