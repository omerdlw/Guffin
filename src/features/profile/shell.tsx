"use client";

import {
  createContext,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
  type SyntheticEvent,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import type { AmbientPalette } from "@omerdlw/base-framework/ambient";
import {
  useDockActions,
  useDockContextActions,
} from "@omerdlw/base-framework/dock";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { REGISTRY_SOURCES, usePage } from "@omerdlw/base-framework/kernel";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  report,
  toUserMessage,
  UserError,
} from "@omerdlw/base-framework/utils";
import { usePathname } from "next/navigation";
import { useSurfacePreload } from "@/design/lazy-surface";
import {
  DEFAULT_ACCOUNT_ICON,
  SOCIAL_EVENTS,
} from "@/features/account/account";
import { useAccount } from "@/features/account/provider";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { accountSettingsSurface } from "@/features/settings/surfaces";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/social/actions";
import { getFollowState } from "@/features/social/client";
import { accountHref } from "@/lib/project";
import type { MediaType } from "@/lib/tmdb/shared";
import { AccountSectionTabs } from "./controls";
import { AccountLayout } from "./hero";
import { AccountPart, AccountSection } from "./motion";
import type { AccountData } from "./profile";

interface AccountDockCard {
  description: string | null;
  icon: string;
  title: string;
}

type AccountDockConfig = Partial<AccountDockCard> & {
  action?: ReactNode;
};

interface AccountDockEntry {
  dock: AccountDockConfig | null;
  path: string;
}

interface AccountDockSlots {
  setPageDock: Dispatch<SetStateAction<AccountDockEntry | null>>;
}

interface AccountShellProps {
  account: AccountData;
  children: ReactNode;
  followersCount: number;
  followingCount: number;
  initialFollowStatus: string | null;
  isFollower: boolean;
  isOwner: boolean;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  rememberedVitrin: MediaType;
  statsSlot?: ReactNode;
}

const DOCK_ACTION_ORDER = 10;

function followButtonOf(
  status: string | null,
  pending: boolean,
  username: string,
): { icon: string; tooltip: string } {
  if (pending) {
    return { icon: "svg-spinners:90-ring-with-bg", tooltip: "Updating..." };
  }
  if (status === "accepted") {
    return { icon: "solar:user-cross-bold", tooltip: `Unfollow @${username}` };
  }
  if (status === "pending") {
    return { icon: "solar:user-cross-bold", tooltip: "Cancel follow request" };
  }
  return { icon: "solar:user-plus-bold", tooltip: `Follow @${username}` };
}

const AccountDockContext = createContext<AccountDockSlots | null>(null);

function AccountDockProvider({
  account,
  children,
  isOwner,
}: {
  account: AccountData;
  children: ReactNode;
  isOwner: boolean;
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
  const pathname = usePathname();
  const [entry, setPageDock] = useState<AccountDockEntry | null>(null);
  const pageDock = entry?.path === pathname ? entry.dock : null;
  const slots = useMemo(() => ({ setPageDock }), []);
  const config = useMemo(
    () =>
      isOwner && !pageDock
        ? { ambient: false }
        : { ambient: false, dock: { ...card, ...pageDock } },
    [card, isOwner, pageDock],
  );
  usePage(config, { priority: 260 });

  return <AccountDockContext value={slots}>{children}</AccountDockContext>;
}

export function useAccountDock(dock: AccountDockConfig | null): void {
  const setPageDock = use(AccountDockContext)?.setPageDock;
  const path = usePathname();
  useLayoutEffect(() => {
    setPageDock?.({ dock, path });
  }, [dock, path, setPageDock]);
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
  useSurfacePreload(accountSettingsSurface);
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
                void accountSettingsSurface.open(openSurface, {
                  section: "overview",
                }),
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
  rememberedVitrin,
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
      <AccountDockProvider account={activeAccount} isOwner={isOwner}>
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
              <AccountSectionTabs
                rememberedVitrin={rememberedVitrin}
                username={activeAccount.username}
              />
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
  return (
    <div className="w-full pt-fib-5 lg:pt-fib-6">
      <div key={id}>{children}</div>
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
