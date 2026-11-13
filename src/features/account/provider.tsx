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
import {
  useDockActions,
  useDockContextActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/dock";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import { getCurrentPath, report } from "@omerdlw/base-framework/utils";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useSurfacePreload } from "@/design/lazy-surface";
import { useAuth } from "@/features/auth/provider";
import { signInSurface } from "@/features/auth/surfaces";
import { followsSurface } from "@/features/social/surfaces";
import { isSupabaseConfigured } from "@/lib/env";
import { accountHref } from "@/lib/project";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import {
  type CurrentAccount,
  DEFAULT_ACCOUNT_ICON,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SOCIAL_EVENTS,
} from "./account";
import {
  fetchCurrentAccount,
  fetchInboxCount,
  fetchUnreadCount,
} from "./client";
import { AccountInboxAction } from "./inbox-action";
import { AccountNotificationsSurface } from "./notifications-surface";
import { accountNotificationsSurface, accountSetupSurface } from "./surfaces";

interface AccountState {
  account: CurrentAccount | null;
  error: unknown;
  isLoading: boolean;
}

interface AccountContextValue extends AccountState {
  refresh: () => Promise<void>;
}

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

const INITIAL_ACCOUNT_STATE: AccountState = Object.freeze({
  account: null,
  error: null,
  isLoading: false,
});

const NOTIFICATIONS_ACTION_KEY = "social.notifications";

const NOTIFICATIONS_ACTION_ORDER = -10;

const SIGN_OUT_ACTION_KEY = "auth.sign-out";

const SIGN_OUT_ACTION_ORDER = 30;

const ACCOUNT_ENTRY_PATH = "/account";

const SIGN_OUT_REDIRECT_DELAY_MS = 450;

const REALTIME_DEBOUNCE_MS = 80;

const INBOX_TYPES = new Set(["FOLLOW_REQUEST", "FOLLOW_ACCEPTED"]);

const succeeded = (result: unknown) =>
  (result as { success?: boolean } | undefined)?.success === true;

function changedRow<T extends Record<string, unknown>>(
  payload: RealtimePostgresChangesPayload<T>,
): Partial<T> {
  return payload.eventType === "DELETE" ? payload.old : payload.new;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const [state, setState] = useState<AccountState>(INITIAL_ACCOUNT_STATE);

  const refresh = useCallback(async () => {
    if (!userId) {
      setState(INITIAL_ACCOUNT_STATE);
      return;
    }
    setState((current) => ({ ...current, error: null, isLoading: true }));
    try {
      const account = await fetchCurrentAccount();
      setState({ account, error: null, isLoading: false });
    } catch (error) {
      setState((current) => ({ ...current, error, isLoading: false }));
      throw error;
    }
  }, [userId]);

  useEffect(() => {
    if (auth.isReady) void refresh().catch(() => null);
  }, [auth.isReady, refresh]);

  const value = useMemo(() => ({ ...state, refresh }), [refresh, state]);

  return <AccountContext value={value}>{children}</AccountContext>;
}

export function useAccount(): AccountContextValue {
  const context = use(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used inside AccountProvider");
  }
  return context;
}

function useRemoteCount(
  fetchCount: () => Promise<number>,
  event: (typeof SOCIAL_EVENTS)[keyof typeof SOCIAL_EVENTS],
  enabled: boolean,
): number {
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    if (enabled) void fetchCount().then(setCount, () => null);
  }, [enabled, fetchCount]);

  useEffect(load, [load]);
  useGlobalEvent(event, load, { debounceMs: 150 });

  return enabled ? count : 0;
}

function useSignInPrompt({
  isReady,
  signedIn,
}: {
  isReady: boolean;
  signedIn: boolean;
}): void {
  const pathname = usePathname();
  const router = useRouter();
  const { openSurface } = useDockActions();
  const prompted = useRef<string | null>(null);

  useEffect(() => {
    if (signedIn || pathname !== ACCOUNT_ENTRY_PATH) {
      prompted.current = null;
      return;
    }
    if (!isReady || prompted.current === pathname) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || prompted.current === pathname) return;
      prompted.current = pathname;
      void signInSurface
        .open(openSurface, { data: { next: getCurrentPath() } })
        .then((result) => {
          if (cancelled) return;
          if (
            !succeeded(result) &&
            window.location.pathname === ACCOUNT_ENTRY_PATH
          ) {
            router.replace("/");
          }
          prompted.current = null;
        });
    });

    return () => {
      cancelled = true;
    };
  }, [isReady, openSurface, pathname, router, signedIn]);
}

function sameAccountPath(a: string, b: string): boolean {
  const clean = (path: string) => {
    try {
      return decodeURIComponent(path).replace(/\/+$/, "").toLowerCase();
    } catch {
      return path.replace(/\/+$/, "").toLowerCase();
    }
  };
  return clean(a) === clean(b);
}

function AccountDockRegistration(): null {
  const auth = useAuth();
  const { account } = useAccount();
  const pathname = usePathname();
  const { openSurface } = useDockActions();
  useSurfacePreload(followsSurface);

  const signedIn = auth.isAuthenticated;
  const ownPath = account?.username
    ? accountHref(account.username)
    : ACCOUNT_ENTRY_PATH;
  const ownView = pathname === ACCOUNT_ENTRY_PATH || pathname === ownPath;
  const inboxCount = useRemoteCount(
    fetchInboxCount,
    SOCIAL_EVENTS.INBOX_CHANGE,
    signedIn && Boolean(account?.isPrivate),
  );

  const openInbox = useCallback(() => {
    if (!account) return;
    void followsSurface.open(openSurface, {
      data: {
        canManageRequests: true,
        displayName: account.displayName,
        tab: "inbox",
        userId: account.id,
        username: account.username,
      },
    });
  }, [account, openSurface]);

  const dockConfig = useMemo(
    () => ({
      action:
        signedIn && ownView && inboxCount > 0 ? (
          <AccountInboxAction count={inboxCount} onOpen={openInbox} />
        ) : null,
      description:
        (signedIn && account?.username && `@${account.username}`) ||
        "Manage your account",
      icon: (signedIn && account?.avatarUrl) || DEFAULT_ACCOUNT_ICON,
      keepWhenDescendant: (activePath?: unknown) =>
        typeof activePath === "string" &&
        activePath.startsWith(ACCOUNT_ENTRY_PATH) &&
        !sameAccountPath(activePath, ACCOUNT_ENTRY_PATH) &&
        !sameAccountPath(activePath, ownPath),
      path: ACCOUNT_ENTRY_PATH,
      targetPath: ownPath,
      title: (signedIn && account?.displayName) || "Account",
    }),
    [account, inboxCount, openInbox, ownPath, ownView, signedIn],
  );

  const onOwnProfile = sameAccountPath(pathname, ownPath);
  useDockRegistration(onOwnProfile ? null : dockConfig, {
    priority: 200,
    source: REGISTRY_SOURCES.DYNAMIC,
  });
  useSignInPrompt({ isReady: auth.isReady, signedIn });

  return null;
}

function AccountSetupPrompt(): null {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  useSurfacePreload(accountSetupSurface);
  const prompted = useRef(false);

  useEffect(() => {
    if (!auth.isReady || !auth.isAuthenticated || prompted.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("setup") !== "account") return;

    prompted.current = true;
    url.searchParams.delete("setup");
    url.searchParams.delete("next");
    window.history.replaceState(null, "", url.toString());
    queueMicrotask(() => void accountSetupSurface.open(openSurface));
  }, [auth.isAuthenticated, auth.isReady, openSurface]);

  return null;
}

function formatBadgeCount(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

function AccountDockActions(): null {
  const auth = useAuth();
  const router = useRouter();
  const { closeSurface, openSurface } = useDockActions();
  useSurfacePreload(accountNotificationsSurface);
  const notificationsOpen = useDockSelector(
    (state) =>
      state.activeSurfaceEntry?.component === AccountNotificationsSurface,
  );
  const signedIn = auth.isReady && auth.isAuthenticated;
  const unreadCount = useRemoteCount(
    fetchUnreadCount,
    SOCIAL_EVENTS.NOTIFICATION_CHANGE,
    auth.isAuthenticated,
  );

  const toggleNotifications = useCallback(
    (event?: { preventDefault(): void; stopPropagation(): void }) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (notificationsOpen) {
        closeSurface();
        return;
      }
      void accountNotificationsSurface.open(openSurface);
    },
    [closeSurface, notificationsOpen, openSurface],
  );

  const signOut = useCallback(async () => {
    await auth.signOut("local");
    window.setTimeout(() => router.replace("/"), SIGN_OUT_REDIRECT_DELAY_MS);
  }, [auth, router]);

  const actions = useMemo(
    () => [
      {
        badge: formatBadgeCount(unreadCount),
        icon: NOTIFICATIONS_ICON,
        key: NOTIFICATIONS_ACTION_KEY,
        onClick: toggleNotifications,
        order: NOTIFICATIONS_ACTION_ORDER,
        tooltip: NOTIFICATIONS_TITLE,
        visible: signedIn,
      },
      {
        icon: "solar:logout-2-bold",
        key: SIGN_OUT_ACTION_KEY,
        onClick: () => void signOut(),
        order: SIGN_OUT_ACTION_ORDER,
        tooltip: "Exit",
        visible: signedIn,
      },
    ],
    [signOut, signedIn, toggleNotifications, unreadCount],
  );

  useDockContextActions(actions);

  return null;
}

export function AccountGuard() {
  return (
    <>
      <AccountDockRegistration />
      <AccountSetupPrompt />
      <AccountDockActions />
    </>
  );
}

export function SocialRealtimeSync(): null {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const accessToken = auth.session?.access_token ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured() || !auth.isAuthenticated || !userId) return;

    const supabase = createBrowserSupabaseClient();
    const refreshInbox = () =>
      globalEvents.emitDebounced(
        SOCIAL_EVENTS.INBOX_CHANGE,
        undefined,
        REALTIME_DEBOUNCE_MS,
      );

    const onFollowChange = (
      payload: RealtimePostgresChangesPayload<TableRow<"account_follows">>,
    ) => {
      const { follower_id, following_id, status } = changedRow(payload);
      if (following_id === userId) refreshInbox();
      if (following_id !== userId && follower_id !== userId) return;
      globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
        followerId: follower_id ?? null,
        followingId: following_id ?? null,
        status: payload.eventType === "DELETE" ? null : (status ?? null),
      });
    };

    try {
      if (accessToken) void supabase.realtime.setAuth(accessToken);
      const channel = supabase
        .channel(`social:user:${userId}`)
        .on<TableRow<"notifications">>(
          "postgres_changes",
          {
            event: "*",
            filter: `user_id=eq.${userId}`,
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            globalEvents.emitDebounced(
              SOCIAL_EVENTS.NOTIFICATION_CHANGE,
              undefined,
              REALTIME_DEBOUNCE_MS,
            );
            const type = changedRow(payload).type;
            if (type && INBOX_TYPES.has(type)) refreshInbox();
          },
        )
        .on<TableRow<"account_follows">>(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `follower_id=eq.${userId}`,
            schema: "public",
            table: "account_follows",
          },
          onFollowChange,
        )
        .on<TableRow<"account_follows">>(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `following_id=eq.${userId}`,
            schema: "public",
            table: "account_follows",
          },
          onFollowChange,
        )
        .on<TableRow<"account_follows">>(
          "postgres_changes",
          {
            event: "UPDATE",
            filter: `follower_id=eq.${userId}`,
            schema: "public",
            table: "account_follows",
          },
          onFollowChange,
        )
        .on<TableRow<"account_follows">>(
          "postgres_changes",
          {
            event: "UPDATE",
            filter: `following_id=eq.${userId}`,
            schema: "public",
            table: "account_follows",
          },
          onFollowChange,
        )
        .on<TableRow<"account_follows">>(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "account_follows" },
          onFollowChange,
        )
        .subscribe();

      return () => void supabase.removeChannel(channel);
    } catch (error) {
      report("Social realtime init", error, "warn");
    }
  }, [accessToken, auth.isAuthenticated, userId]);

  return null;
}
