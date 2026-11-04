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
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import {
  useDockActions,
  useDockContextActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/modules/dock";
import { getCurrentPath, report } from "@omerdlw/base-framework/utils";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import { createSignInSurfaceEntry } from "@/features/auth/sign-in";
import { isSupabaseConfigured } from "@/lib/env";
import { accountHref } from "@/lib/project";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  fetchCurrentAccount,
  fetchInboxCount,
  fetchUnreadCount,
} from "./client";
import {
  ACCOUNT_ENTRY_PATH,
  DEFAULT_ACCOUNT_ICON,
  INBOX_TYPES,
  INITIAL_ACCOUNT_STATE,
  NOTIFICATIONS_ACTION_KEY,
  NOTIFICATIONS_ACTION_ORDER,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  REALTIME_DEBOUNCE_MS,
  SIGN_OUT_ACTION_KEY,
  SIGN_OUT_ACTION_ORDER,
  SIGN_OUT_REDIRECT_DELAY_MS,
  SOCIAL_EVENTS,
} from "./constants";
import {
  AccountInboxAction,
  AccountNotificationsSurface,
  createAccountNotificationsSurfaceEntry,
} from "./notifications";
import { createAccountSetupSurfaceEntry } from "./setup";
import { createAccountSocialSurfaceEntry } from "./social";
import type { AccountContextValue, AccountState, TableRow } from "./types";
import { changedRow, succeeded } from "./utils";

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
      void openSurface(
        createSignInSurfaceEntry({ next: getCurrentPath() }),
      ).then((result) => {
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

function AccountDockRegistration(): null {
  const auth = useAuth();
  const { account } = useAccount();
  const pathname = usePathname();
  const { openSurface } = useDockActions();

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
    void openSurface(
      createAccountSocialSurfaceEntry({
        canManageRequests: true,
        displayName: account.displayName,
        tab: "inbox",
        userId: account.id,
        username: account.username,
      }),
    );
  }, [account, openSurface]);

  const dockConfig = useMemo(
    () => ({
      action:
        signedIn && ownView && inboxCount > 0 ? (
          <AccountInboxAction count={inboxCount} onOpen={openInbox} />
        ) : null,
      bannerPosition: (signedIn && account?.bannerPosition) || null,
      bannerUrl: (signedIn && account?.bannerUrl) || null,
      description:
        (signedIn && account?.username && `@${account.username}`) ||
        "Manage your account",
      icon: (signedIn && account?.avatarUrl) || DEFAULT_ACCOUNT_ICON,
      keepWhenDescendant: (activePath?: unknown) =>
        typeof activePath === "string" &&
        activePath.startsWith(ACCOUNT_ENTRY_PATH) &&
        activePath !== ACCOUNT_ENTRY_PATH &&
        activePath !== ownPath,
      path: ACCOUNT_ENTRY_PATH,
      targetPath: ownPath,
      title: (signedIn && account?.displayName) || "Account",
    }),
    [account, inboxCount, openInbox, ownPath, ownView, signedIn],
  );

  useDockRegistration(dockConfig, {
    priority: 200,
    source: REGISTRY_SOURCES.DYNAMIC,
  });
  useSignInPrompt({ isReady: auth.isReady, signedIn });

  return null;
}

function AccountSetupPrompt(): null {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const prompted = useRef(false);

  useEffect(() => {
    if (!auth.isReady || !auth.isAuthenticated || prompted.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("setup") !== "account") return;

    prompted.current = true;
    url.searchParams.delete("setup");
    url.searchParams.delete("next");
    window.history.replaceState(null, "", url.toString());
    queueMicrotask(() => void openSurface(createAccountSetupSurfaceEntry()));
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
      void openSurface(createAccountNotificationsSurfaceEntry());
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
          { event: "*", schema: "public", table: "account_follows" },
          (payload) => {
            const { follower_id, following_id, status } = changedRow(payload);
            if (following_id === userId) refreshInbox();
            if (following_id !== userId && follower_id !== userId) return;
            globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
              followerId: follower_id ?? null,
              followingId: following_id ?? null,
              status: payload.eventType === "DELETE" ? null : (status ?? null),
            });
          },
        )
        .subscribe();

      return () => void supabase.removeChannel(channel);
    } catch (error) {
      report("Social realtime init", error, "warn");
    }
  }, [accessToken, auth.isAuthenticated, userId]);

  return null;
}
