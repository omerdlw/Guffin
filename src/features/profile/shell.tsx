"use client";

import {
  createContext,
  type JSX,
  type ReactNode,
  type SyntheticEvent,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { REGISTRY_SOURCES, usePage } from "@omerdlw/base-framework/kernel";
import {
  useDockActions,
  useDockContextActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import {
  report,
  toUserMessage,
  UserError,
} from "@omerdlw/base-framework/utils";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/account/actions";
import { getFollowState } from "@/features/account/client";
import {
  DEFAULT_ACCOUNT_ICON,
  SOCIAL_EVENTS,
} from "@/features/account/constants";
import { useAccount } from "@/features/account/provider";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { createAccountSettingsSurfaceEntry } from "@/features/settings/surface";
import { accountHref } from "@/lib/project";
import { Value } from "@/motion/engine";
import { ScopeProvider, useEngine, useScope } from "@/motion/react";
import { childScope } from "@/motion/stage";
import { CURVE } from "@/motion/time";
import { step } from "@/motion/utils";
import { DOCK_ACTION_ORDER, SHELL_SETTLE_RUNG } from "./constants";
import { AccountSectionTabs } from "./controls";
import { AccountLayout } from "./hero";
import { AccountPart, AccountSection, useAccountStage } from "./motion";
import type {
  AccountData,
  AccountDockConfig,
  AccountDockSlots,
  AccountShellProps,
} from "./types";
import { followButtonOf } from "./utils";

const AccountDockContext = createContext<AccountDockSlots | null>(null);

function AccountDockProvider({
  account,
  children,
}: {
  account: AccountData;
  children: ReactNode;
}) {
  const { avatarUrl, displayName, username } = account;
  const card = useMemo(
    () => ({
      description: username ? `@${username}` : null,
      icon: avatarUrl || DEFAULT_ACCOUNT_ICON,
      title: displayName || username || "Account",
    }),
    [avatarUrl, displayName, username],
  );
  const [pageDock, setPageDock] = useState<AccountDockConfig | null>(null);
  const slots = useMemo(() => ({ setPageDock }), []);
  /* The card is always this account's: a page adds its action to it. Without
     a config the dock falls back to the static "Account" placeholder. */
  const config = useMemo(
    () => ({ ambient: false, dock: { ...card, ...pageDock } }),
    [card, pageDock],
  );
  usePage(config, { priority: 260 });

  return <AccountDockContext value={slots}>{children}</AccountDockContext>;
}

export function useAccountDock(dock: AccountDockConfig | null): void {
  const setPageDock = use(AccountDockContext)?.setPageDock;
  useLayoutEffect(() => {
    if (!setPageDock) return;
    setPageDock(dock);
    return () => setPageDock(null);
  }, [dock, setPageDock]);
}

function useFollowToggle({
  id,
  initialFollowStatus,
  isOwner,
  username,
}: {
  id: string;
  initialFollowStatus: string | null;
  isOwner: boolean;
  username: string;
}) {
  const auth = useAuth();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [followStatus, setFollowStatus] = useState(initialFollowStatus);
  const [syncedStatus, setSyncedStatus] = useState(initialFollowStatus);
  const [isPending, startTransition] = useTransition();
  const [shownStatus, setShownStatus] = useOptimistic(
    followStatus,
    (_current, next: string | null) => next,
  );

  if (initialFollowStatus !== syncedStatus) {
    setSyncedStatus(initialFollowStatus);
    setFollowStatus(initialFollowStatus);
  }

  useEffect(() => {
    if (!auth.isAuthenticated || isOwner) return;
    void getFollowState(id).then(setFollowStatus, () => null);
  }, [auth.isAuthenticated, id, isOwner]);

  useGlobalEvent(isOwner ? null : SOCIAL_EVENTS.FOLLOW_CHANGE, (payload) => {
    if (payload.followingId === id) setFollowStatus(payload.status);
  });

  const toggleFollow = useCallback(
    (event?: SyntheticEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (!auth.isAuthenticated) {
        openSignIn();
        return;
      }
      if (isPending) return;

      const previous = followStatus;
      const following = shownStatus === "accepted" || shownStatus === "pending";
      const announce = (status: string | null) =>
        globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
          followingId: id,
          status,
        });

      startTransition(async () => {
        setShownStatus(following ? null : "accepted");
        try {
          const result = following
            ? await unfollowUserAction(id, username)
            : await followUserAction(id, username);
          if (!result.success) throw new UserError(result.error);
          setFollowStatus(result.data);
          announce(result.data);
        } catch (error) {
          report("Social follow status", error);
          setFollowStatus(previous);
          setShownStatus(previous);
          announce(previous);
          toast(toUserMessage(error, { fallback: "Follow action failed" }));
        }
      });
    },
    [
      auth.isAuthenticated,
      followStatus,
      id,
      isPending,
      openSignIn,
      setShownStatus,
      shownStatus,
      toast,
      username,
    ],
  );

  return { isPending, shownStatus, toggleFollow };
}

function AccountRegistry({
  account,
  initialFollowStatus,
  isOwner,
}: {
  account: AccountData;
  initialFollowStatus: string | null;
  isOwner: boolean;
}): null {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const { avatarUrl, displayName, id, username } = account;
  const { isPending, shownStatus, toggleFollow } = useFollowToggle({
    id,
    initialFollowStatus,
    isOwner,
    username,
  });

  const actions = useMemo(
    () =>
      isOwner
        ? [
            {
              icon: "solar:settings-bold",
              key: "account.settings",
              onClick: () =>
                void openSurface(createAccountSettingsSurfaceEntry("overview")),
              order: DOCK_ACTION_ORDER,
              tooltip: "Account settings",
              visible: auth.isReady && auth.isAuthenticated,
            },
          ]
        : [
            {
              ...followButtonOf(shownStatus, isPending, username),
              disabled: isPending,
              key: "social.follow",
              onClick: toggleFollow,
              order: DOCK_ACTION_ORDER,
              visible: true,
            },
          ],
    [
      auth.isAuthenticated,
      auth.isReady,
      isOwner,
      isPending,
      openSurface,
      shownStatus,
      toggleFollow,
      username,
    ],
  );

  useDockContextActions(actions);

  const dock = useMemo(
    () =>
      isOwner
        ? null
        : {
            description: `@${username}`,
            icon: avatarUrl || DEFAULT_ACCOUNT_ICON,
            path: accountHref(username),
            title: displayName || username,
          },
    [avatarUrl, displayName, isOwner, username],
  );

  usePage(dock ? { ambient: false, dock } : {}, {
    priority: 250,
    source: REGISTRY_SOURCES.DYNAMIC,
  });

  return null;
}

export function AccountShell({
  account,
  children,
  followersCount,
  followingCount,
  initialFollowStatus,
  isFollower,
  isOwner: initialIsOwner,
  palette,
  proofSlot,
  statsSlot,
}: AccountShellProps): JSX.Element {
  const auth = useAuth();
  const accountState = useAccount();
  const isOwner =
    initialIsOwner ||
    Boolean(
      auth.isAuthenticated &&
      auth.user?.id &&
      account?.id &&
      auth.user.id === account.id,
    );

  const activeAccount =
    isOwner && accountState.account
      ? { ...account, ...accountState.account }
      : account;

  return (
    <>
      <AccountRegistry
        account={activeAccount}
        initialFollowStatus={initialFollowStatus}
        isOwner={isOwner}
      />
      <AccountDockProvider account={activeAccount}>
        <AccountLayout
          account={activeAccount}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollower={isFollower}
          isOwner={isOwner}
          palette={palette}
          proofSlot={proofSlot}
          statsSlot={statsSlot}
          tabsSlot={
            activeAccount.username ? (
              <AccountSectionTabs username={activeAccount.username} />
            ) : null
          }
        >
          {children}
        </AccountLayout>
      </AccountDockProvider>
    </>
  );
}

export function AccountView({
  children,
  id,
}: {
  children: ReactNode;
  id: string;
}) {
  const stage = useAccountStage();
  const engine = useEngine();
  const base = childScope(useScope(), useId());
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState({ id, scope: `${base}0` });
  const [held, setHeld] = useState<ReactNode>(children);
  const swapping = useRef(false);
  const latest = useRef({ id, children });
  const turns = useRef(0);
  const settle = useRef<Value | null>(null);

  useEffect(() => {
    latest.current = { id, children };
  });

  useLayoutEffect(() => {
    if (id === shown.id && held !== children) setHeld(children);
  });

  useEffect(() => {
    if (id === shown.id || swapping.current) return;
    swapping.current = true;
    const el = box.current;
    if (el) {
      el.style.height = `${el.offsetHeight}px`;
      el.style.overflow = "clip";
    }
    void stage.dismiss(shown.scope).then(() => {
      turns.current += 1;
      swapping.current = false;
      setShown({ id: latest.current.id, scope: `${base}${turns.current}` });
    });
  }, [id, shown.id, shown.scope, stage, base]);

  useLayoutEffect(() => {
    if (turns.current === 0) return;
    const el = box.current;
    if (!el) return;
    const from = el.offsetHeight;
    el.style.height = "";
    const to = el.offsetHeight;
    el.style.height = `${from}px`;
    const height = (settle.current ??= new Value(engine.clock));
    height.set(from);
    const stop = height.subscribe((h) => {
      el.style.height = `${h}px`;
    });
    void height
      .to(to, {
        tween: engine.reduced.get() ? 0 : step(SHELL_SETTLE_RUNG + stage.tempo),
        curve: CURVE.silk,
      })
      .then(() => {
        stop();
        el.style.height = "";
        el.style.overflow = "";
      });
    return () => stop();
  }, [shown.scope, engine, stage]);

  const content = id === shown.id ? children : held;

  return (
    <div className="w-full pt-fib-5 lg:pt-fib-6" ref={box}>
      <ScopeProvider value={shown.scope}>
        <div key={shown.scope}>{content}</div>
      </ScopeProvider>
    </div>
  );
}

export function AccountPage({ children }: { children: ReactNode }) {
  return (
    <AccountSection as="div" className="w-full" cue="page" now>
      <AccountPart name="page">{children}</AccountPart>
    </AccountSection>
  );
}
