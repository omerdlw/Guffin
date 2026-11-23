"use client";

import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { USER_MESSAGES } from "@omerdlw/base-framework/utils";
import { ActionLabel } from "@/design/components/action-content";
import { useConfirm } from "@/design/components/confirm";
import { Link } from "@/design/components/link";
import { SurfaceSegmentedControl } from "@/design/components/segmented-control";
import { SKELETON } from "@/design/components/skeleton";
import {
  SurfacePart,
  SurfaceSearch,
  SurfaceStage,
  SurfaceSwap,
  useSurfaceSearch,
} from "@/design/components/surface";
import {
  GROUP_HIGHLIGHT,
  groupRowVariants,
  SURFACE_GROUP,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import { defineSurface } from "@/design/surface-definition";
import { cn } from "@/design/ui";
import { SOCIAL_EVENTS } from "@/features/account/account";
import {
  AccountAvatarImage,
  AvatarTile,
  StatusTile,
} from "@/features/account/tiles";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/shared/project";
import { fetchFollowPage } from "./client";
import {
  loadRequests,
  useCollection,
  useFollowStatuses,
  useSocialActions,
} from "./hooks";
import type {
  FollowUser,
  SocialAction,
  SocialCollection,
  SocialPageLoader,
} from "./social";

type SocialTab = "followers" | "following" | "inbox";

interface UserActionProps {
  followStatus: string | null;
  onAction: (action: SocialAction, id: string) => void;
  ownProfile: boolean;
  pending: SocialAction | null;
  showFollow: boolean;
  tab: SocialTab;
  userId: string;
}

interface AccountSocialData {
  avatarUrl?: string;
  canManageRequests?: boolean;
  displayName: string;
  tab: SocialTab;
  userId: string;
  username?: string;
}

const SOCIAL_TAB_LABELS: Record<SocialTab, string> = {
  followers: "Followers",
  following: "Following",
  inbox: "Follow Requests",
};

const SOCIAL_BUTTON = "min-w-[5.5rem]";

const REVEAL =
  "ui-fade pointer-events-none opacity-0 group-hover/user:pointer-events-auto group-hover/user:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100";

const SWAP_DANGER = "hover:bg-danger/15 hover:text-danger hover:ring-danger/25";

const SOCIAL_ROW = groupRowVariants();

function socialErrorMessage(error: unknown, tab: SocialTab): string {
  const status = (error as { status?: number } | null)?.status;
  if (status === 403) {
    return tab === "inbox"
      ? "You can't view these follow requests"
      : "This account is private";
  }
  if (status === 401) return USER_MESSAGES.unauthorized;
  return tab === "inbox"
    ? "Couldn't load your follow requests"
    : `Couldn't load ${tab}`;
}

function LoadingRow() {
  return (
    <div className={SOCIAL_ROW}>
      <div className={`${SKELETON.block} size-10 shrink-0 rounded-full`} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className={cn(SKELETON.block, "h-3 w-28 rounded-full")} />
        <div className={cn(SKELETON.block, "h-2.5 w-16 rounded-full")} />
      </div>
      <div
        className={`${SKELETON.block} h-control-sm w-[5.5rem] shrink-0 rounded-full`}
      />
    </div>
  );
}

function LoadMoreSentinel({
  loading,
  onVisible,
}: {
  loading: boolean;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible();
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div aria-hidden="true" className="flex w-full flex-col" ref={ref}>
      {loading ? <LoadingRow /> : null}
    </div>
  );
}

const UserRow = memo(function UserRow({
  action,
  onNavigate,
  user,
}: {
  action: ReactNode;
  onNavigate?: () => void;
  user: FollowUser;
}) {
  const highlight = useHighlight(user.id, GROUP_HIGHLIGHT);

  return (
    <div className={`${SOCIAL_ROW} group/user`} {...highlight.props}>
      {highlight.node}
      <Link
        className={`relative z-10 flex h-full min-w-0 flex-1 items-center gap-3 ${SURFACE_TILE_INNER}`}
        href={accountHref(user.username || user.id)}
        onClick={onNavigate}
      >
        <AvatarTile>
          <AccountAvatarImage account={user} alt={user.displayName} />
        </AvatarTile>
        <div className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>{user.displayName}</span>
          <span className={`${SURFACE_META} group-hover/user:text-ink-body`}>
            @{user.username || "user"}
          </span>
        </div>
      </Link>
      {action ? (
        <div className="relative z-10 flex shrink-0 items-center">{action}</div>
      ) : null}
    </div>
  );
});

const UserAction = memo(function UserAction({
  followStatus,
  onAction,
  ownProfile,
  pending,
  showFollow,
  tab,
  userId,
}: UserActionProps) {
  const busy = pending !== null;
  const confirm = useConfirm();

  const act = async (action: SocialAction) => {
    if (
      action === "unfollow" &&
      !(await confirm({
        action: "Unfollow",
        description: "You can follow them again any time",
        icon: "solar:user-minus-bold",
        title: "Unfollow this person?",
        tone: "neutral",
      }))
    )
      return;
    onAction(action, userId);
  };

  const button = (
    action: SocialAction,
    label: string,
    intent: "outline" | "primary",
  ) => {
    return (
      <Button
        aria-label={label}
        className={SOCIAL_BUTTON}
        intent={intent}
        shape="pill"
        size="sm"
        disabled={busy}
        loading={pending === action}
        onClick={() => void act(action)}
      >
        <ActionLabel>{label}</ActionLabel>
      </Button>
    );
  };

  if (tab === "inbox") {
    return (
      <div className="flex shrink-0 items-center gap-2">
        {button("accept", "Accept", "primary")}
        {button("reject", "Reject", "outline")}
      </div>
    );
  }
  if (ownProfile) {
    return (
      <span className={REVEAL}>
        <Button
          aria-label={tab === "following" ? "Unfollow" : "Remove"}
          className={cn(SOCIAL_BUTTON, SWAP_DANGER)}
          disabled={busy}
          intent="neutral"
          loading={pending === (tab === "following" ? "unfollow" : "remove")}
          onClick={() => void act(tab === "following" ? "unfollow" : "remove")}
          shape="pill"
          size="sm"
        >
          <ActionLabel>
            {tab === "following" ? "Unfollow" : "Remove"}
          </ActionLabel>
        </Button>
      </span>
    );
  }
  if (!showFollow) return null;

  const requested = followStatus === "pending";
  const following = followStatus === "accepted";
  if (following) return button("unfollow", "Following", "outline");
  return (
    <Button
      aria-label={requested ? "Requested" : "Follow"}
      className={SOCIAL_BUTTON}
      intent={requested ? "ghost" : "primary"}
      shape="pill"
      size="sm"
      disabled={busy || requested}
      onClick={() => act("follow")}
    >
      <ActionLabel>{requested ? "Requested" : "Follow"}</ActionLabel>
    </Button>
  );
});

const userText = (user: FollowUser) =>
  `${user.displayName} ${user.username ?? ""}`;

function SocialTabStatus({
  collection,
  query,
  tab,
}: {
  collection: SocialCollection;
  query?: string;
  tab: SocialTab;
}) {
  const isInbox = tab === "inbox";

  if (query) {
    return (
      <StatusTile
        description={`Nothing in ${tab} matches “${query}”`}
        icon="solar:magnifer-linear"
        title="No results"
      />
    );
  }

  if (collection.error) {
    return (
      <StatusTile
        description={socialErrorMessage(collection.error, tab)}
        icon="solar:danger-circle-bold"
        title={`Couldn't load ${tab}`}
      />
    );
  }
  return (
    <StatusTile
      description={
        isInbox
          ? "Incoming follow requests will appear here"
          : `No ${tab} yet for this account`
      }
      icon={
        isInbox ? "solar:inbox-line-bold" : "solar:users-group-rounded-bold"
      }
      title={isInbox ? "No pending follow requests" : `No ${tab} yet`}
    />
  );
}

function AccountSocialSurface({
  close,
  data,
}: {
  close?: () => void;
  data: AccountSocialData;
}) {
  const auth = useAuth();
  const viewerId = auth.user?.id ?? null;
  const userId = data.userId;
  const ownProfile = viewerId !== null && viewerId === userId;
  const canManageRequests = Boolean(data.canManageRequests) || ownProfile;
  const signedIn = auth.isReady && auth.isAuthenticated && viewerId !== null;

  const [tab, setTab] = useState<SocialTab>(data.tab);

  const loadFollowers = useCallback<SocialPageLoader>(
    (cursor) => fetchFollowPage("followers", userId, cursor),
    [userId],
  );
  const loadFollowing = useCallback<SocialPageLoader>(
    (cursor) => fetchFollowPage("following", userId, cursor),
    [userId],
  );
  const followers = useCollection(loadFollowers, Boolean(userId));
  const following = useCollection(loadFollowing, Boolean(userId));
  const requests = useCollection(loadRequests, canManageRequests && signedIn);
  const [followStatus, setFollowStatus] = useFollowStatuses(
    followers.state.list,
    following.state.list,
  );

  const { pending, runAction } = useSocialActions({
    collections: { followers, following, requests },
    ownProfile,
    setFollowStatus,
    viewerId,
  });

  useGlobalEvent(
    SOCIAL_EVENTS.FOLLOW_CHANGE,
    () => {
      followers.reload();
      following.reload();
    },
    { debounceMs: 250 },
  );
  useGlobalEvent(
    SOCIAL_EVENTS.INBOX_CHANGE,
    () => {
      if (canManageRequests && viewerId) requests.reload();
    },
    { debounceMs: 250 },
  );

  const showInbox =
    canManageRequests &&
    (requests.state.loading ||
      requests.state.list.length > 0 ||
      Boolean(requests.state.error));

  const tabs = useMemo(
    () => [
      {
        count: following.state.total ?? following.state.list.length,
        key: "following" as const,
        label: "Following",
      },
      {
        count: followers.state.total ?? followers.state.list.length,
        key: "followers" as const,
        label: "Followers",
      },
      ...(showInbox
        ? [
            {
              count: requests.state.list.length,
              key: "inbox" as const,
              label: "Inbox",
            },
          ]
        : []),
    ],
    [followers.state, following.state, requests.state.list.length, showInbox],
  );

  const controllers = { followers, following, inbox: requests };
  const { loadMore, state: active } = controllers[tab];

  const search = useSurfaceSearch(
    active.list,
    userText,
    active.total ?? active.list.length,
  );
  const { searching } = search;

  const attempted = useRef<unknown>(null);
  useEffect(() => {
    if (!searching) {
      attempted.current = null;
      return;
    }
    if (!active.next || active.loadingMore || attempted.current === active.next)
      return;
    attempted.current = active.next;
    void loadMore();
  }, [active.loadingMore, active.next, loadMore, searching]);

  const { setQuery } = search;
  const changeTab = useCallback(
    (next: SocialTab) => {
      setQuery("");
      setTab(next);
    },
    [setQuery],
  );

  let view: string;
  let body: ReactNode;
  if (active.loading) {
    view = "loading";
    body = (
      <SurfacePart className={SURFACE_GROUP} name="item">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingRow key={index} />
        ))}
      </SurfacePart>
    );
  } else if (active.error || active.list.length === 0) {
    view = "status";
    body = (
      <SurfacePart name="note">
        <SocialTabStatus collection={active} tab={tab} />
      </SurfacePart>
    );
  } else if (searching && search.matches.length === 0) {
    const more = Boolean(active.next || active.loadingMore);
    view = more ? "searching" : "none";
    body = more ? (
      <SurfacePart className={SURFACE_GROUP} name="item">
        <LoadingRow />
      </SurfacePart>
    ) : (
      <SurfacePart name="note">
        <SocialTabStatus
          collection={active}
          query={search.query.trim()}
          tab={tab}
        />
      </SurfacePart>
    );
  } else {
    view = "list";
    body = (
      <div
        className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
        data-scroll-native
      >
        <HighlightGroup className={SURFACE_GROUP}>
          {search.matches.map((user, index) => (
            <SurfacePart index={index} key={user.id} name="row">
              <UserRow
                action={
                  <UserAction
                    followStatus={followStatus[user.id] || null}
                    onAction={runAction}
                    ownProfile={ownProfile}
                    pending={pending[user.id] ?? null}
                    showFollow={viewerId !== null && viewerId !== user.id}
                    tab={tab}
                    userId={user.id}
                  />
                }
                onNavigate={close}
                user={user}
              />
            </SurfacePart>
          ))}
          {active.next && !searching ? (
            <LoadMoreSentinel
              loading={active.loadingMore}
              onVisible={loadMore}
            />
          ) : null}
        </HighlightGroup>
      </div>
    );
  }

  return (
    <SurfaceStage className="flex flex-col overflow-clip [overflow-clip-margin:var(--spacing-swell)]">
      <SurfaceSegmentedControl
        ariaLabel="Followers and following"
        items={tabs}
        onChange={changeTab}
        value={tab}
      />
      {search.enabled ? (
        <SurfacePart className="mb-2.5" name="item">
          <SurfaceSearch
            label={`Search ${tab}`}
            onChange={search.setQuery}
            value={search.query}
          />
        </SurfacePart>
      ) : null}
      <SurfaceSwap cue="items" id={`${tab}-${view}`}>
        {body}
      </SurfaceSwap>
    </SurfaceStage>
  );
}

export const followsSurface = defineSurface<{ data: AccountSocialData }>({
  component: AccountSocialSurface,
  description: ({ data }) => SOCIAL_TAB_LABELS[data.tab],
  icon: ({ data }) => data.avatarUrl ?? "solar:users-group-rounded-bold",
  title: ({ data }) => data.displayName.trim() || data.username || "Social",
});
