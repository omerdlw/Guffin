"use client";

import {
  type Dispatch,
  memo,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { toUserMessage, UserError } from "@omerdlw/base-framework/utils";
import Link from "next/link";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/lib/project";
import { Button } from "@/ui/button";
import {
  HighlightGroup,
  SurfaceSegmentedControl,
  useHighlight,
} from "@/ui/form";
import { scrollWithin } from "@/ui/surface";
import {
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/ui/tokens";
import { followUserAction, unfollowUserAction } from "./actions";
import {
  acceptFollowRequest,
  fetchFollowPage,
  fetchFollowRequests,
  rejectFollowRequest,
  removeFollower,
} from "./client";
import {
  SOCIAL_EVENTS,
  SOCIAL_MUTED_BUTTON,
  SOCIAL_PRIMARY_BUTTON,
  SOCIAL_ROW,
  SOCIAL_SECONDARY_BUTTON,
  SOCIAL_TAB_LABELS,
} from "./constants";
import { AccountAvatarImage, AvatarTile, StatusTile } from "./tiles";
import type {
  AccountSocialData,
  FollowUser,
  SocialAction,
  SocialActionPlan,
  SocialCollection,
  SocialCollectionController,
  SocialPageLoader,
  SocialTab,
  UserActionProps,
} from "./types";
import { socialErrorMessage, withoutUser } from "./utils";

const loadRequests: SocialPageLoader = async () => ({
  items: await fetchFollowRequests(),
  next: null,
  total: null,
});

function useCollection(
  load: SocialPageLoader,
  enabled: boolean,
): SocialCollectionController {
  const [state, setState] = useState<SocialCollection>({
    error: null,
    list: [],
    loading: enabled,
    loadingMore: false,
    next: null,
    total: null,
  });
  const requestId = useRef(0);
  const isLoadingMore = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setState((current) =>
        current.loading ? { ...current, loading: false } : current,
      );
      return;
    }
    const id = ++requestId.current;
    setState((current) => ({
      ...current,
      error: null,
      loading: current.list.length === 0,
    }));
    try {
      const page = await load();
      if (id !== requestId.current) return;
      setState({
        error: null,
        list: page.items,
        loading: false,
        loadingMore: false,
        next: page.next,
        total: page.total,
      });
    } catch (error) {
      if (id === requestId.current) {
        setState((current) => ({ ...current, error, loading: false }));
      }
    }
  }, [enabled, load]);

  const cursor = state.next;
  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore.current) return;
    isLoadingMore.current = true;
    const id = requestId.current;
    setState((current) => ({ ...current, loadingMore: true }));
    try {
      const page = await load(cursor);
      if (id !== requestId.current) return;
      setState((current) => {
        const known = new Set(current.list.map((user) => user.id));
        return {
          ...current,
          list: [
            ...current.list,
            ...page.items.filter((user) => !known.has(user.id)),
          ],
          loadingMore: false,
          next: page.next,
        };
      });
    } catch {
      setState((current) => ({ ...current, loadingMore: false }));
    } finally {
      isLoadingMore.current = false;
    }
  }, [cursor, load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loadMore, reload, setState, state };
}

function useFollowStatuses(followers: FollowUser[], following: FollowUser[]) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [seen, setSeen] = useState({ followers, following });

  if (seen.followers !== followers || seen.following !== following) {
    setSeen({ followers, following });
    setStatuses((current) => {
      const next = { ...current };
      for (const user of [...followers, ...following]) {
        next[user.id] = user.viewerStatus || "";
      }
      return next;
    });
  }

  return [statuses, setStatuses] as const;
}

function snapshotState<T>(
  setter: Dispatch<SetStateAction<T>>,
  change: (value: T) => T,
) {
  let previous: T | undefined;
  setter((value) => {
    previous = value;
    return change(value);
  });
  return () => {
    if (previous !== undefined) setter(previous as T);
  };
}

function useSocialActions({
  collections,
  ownProfile,
  setFollowStatus,
  viewerId,
}: {
  collections: Record<
    "followers" | "following" | "requests",
    SocialCollectionController
  >;
  ownProfile: boolean;
  setFollowStatus: Dispatch<SetStateAction<Record<string, string>>>;
  viewerId: string | null;
}) {
  const toast = useToast();
  const [pending, setPending] = useState<Record<string, SocialAction>>({});
  const setFollowers = collections.followers.setState;
  const setFollowing = collections.following.setState;
  const setRequests = collections.requests.setState;

  const planAction = useCallback(
    (action: SocialAction, id: string): SocialActionPlan => {
      switch (action) {
        case "accept":
          return {
            apply: () =>
              snapshotState(setRequests, (state) => withoutUser(state, id)),
            failure: "Couldn't accept this request",
            request: async () => {
              await acceptFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: "accepted",
              });
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
          };
        case "reject":
          return {
            apply: () =>
              snapshotState(setRequests, (state) => withoutUser(state, id)),
            failure: "Couldn't decline this request",
            request: async () => {
              await rejectFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
          };
        case "remove":
          return {
            apply: () =>
              snapshotState(setFollowers, (state) => withoutUser(state, id)),
            failure: "Couldn't remove this follower",
            request: async () => {
              await removeFollower(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: null,
              });
            },
          };
        case "unfollow":
          return {
            apply: () => {
              const revertStatus = snapshotState(
                setFollowStatus,
                ({ [id]: _, ...rest }) => rest,
              );
              const revertList = ownProfile
                ? snapshotState(setFollowing, (state) => withoutUser(state, id))
                : () => {};
              return () => {
                revertStatus();
                revertList();
              };
            },
            failure: "Couldn't unfollow this account",
            request: async () => {
              const result = await unfollowUserAction(id);
              if (!result.success) throw new UserError(result.error);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status: null,
              });
            },
          };
        case "follow":
          return {
            apply: () =>
              snapshotState(setFollowStatus, (statuses) => ({
                ...statuses,
                [id]: "accepted",
              })),
            failure: "Couldn't follow this account",
            request: async () => {
              const result = await followUserAction(id);
              if (!result.success) throw new UserError(result.error);
              setFollowStatus((statuses) => ({
                ...statuses,
                [id]: result.data,
              }));
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status: result.data,
              });
            },
          };
      }
    },
    [
      ownProfile,
      setFollowStatus,
      setFollowers,
      setFollowing,
      setRequests,
      viewerId,
    ],
  );

  const runAction = useCallback(
    async (action: SocialAction, id: string) => {
      if (!viewerId || pending[id]) return;
      const { apply, failure, request } = planAction(action, id);
      setPending((current) => ({ ...current, [id]: action }));
      const revert = apply();
      try {
        await request();
      } catch (error) {
        revert();
        toast(toUserMessage(error, { fallback: failure }));
      } finally {
        setPending(({ [id]: _, ...rest }) => rest);
      }
    },
    [pending, planAction, toast, viewerId],
  );

  return { pending, runAction };
}

function LoadingRow() {
  return (
    <div className={SOCIAL_ROW}>
      <div
        className={`skeleton-block size-10 shrink-0 ${SURFACE_TILE_INNER}`}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="skeleton-block h-3 w-28 rounded-full" />
        <div className="skeleton-block h-2.5 w-16 rounded-full" />
      </div>
      <div
        className={`skeleton-block h-10 w-[6rem] shrink-0 ${SURFACE_TILE_INNER}`}
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
  const highlight = useHighlight(user.id);

  return (
    <div
      className={`${SOCIAL_ROW} relative isolate group/user`}
      {...highlight.props}
    >
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
          <span
            className={`${SURFACE_META} group-hover/user:text-ink-body group-focus-visible/user:text-ink-body group-has-focus-visible/user:text-ink-body`}
          >
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
  const button = (action: SocialAction, label: string, className: string) => (
    <Button
      aria-label={label}
      className={className}
      disabled={busy}
      loading={pending === action}
      onClick={() => onAction(action, userId)}
    >
      <span>{label}</span>
    </Button>
  );

  if (tab === "inbox") {
    return (
      <div className="flex shrink-0 items-center gap-2">
        {button("accept", "Accept", SOCIAL_PRIMARY_BUTTON)}
        {button("reject", "Reject", SOCIAL_SECONDARY_BUTTON)}
      </div>
    );
  }
  if (ownProfile) {
    return tab === "following"
      ? button("unfollow", "Unfollow", SOCIAL_SECONDARY_BUTTON)
      : button("remove", "Remove", SOCIAL_SECONDARY_BUTTON);
  }
  if (!showFollow) return null;

  const requested = followStatus === "pending";
  const following = followStatus === "accepted";
  const label = following ? "Following" : requested ? "Requested" : "Follow";
  return (
    <Button
      aria-label={label}
      className={
        requested
          ? SOCIAL_MUTED_BUTTON
          : following
            ? SOCIAL_SECONDARY_BUTTON
            : SOCIAL_PRIMARY_BUTTON
      }
      disabled={busy || requested}
      onClick={() => onAction(following ? "unfollow" : "follow", userId)}
    >
      <span>{label}</span>
    </Button>
  );
});

function SocialTabStatus({
  collection,
  tab,
}: {
  collection: SocialCollection;
  tab: SocialTab;
}) {
  const isInbox = tab === "inbox";

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

  let body: ReactNode;
  if (active.loading) {
    body = (
      <div className="flex w-full flex-col gap-2.5">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingRow key={index} />
        ))}
      </div>
    );
  } else if (active.error || active.list.length === 0) {
    body = <SocialTabStatus collection={active} tab={tab} />;
  } else {
    body = (
      <div
        className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
        data-scroll-native
        key={tab}
        onWheel={scrollWithin}
      >
        <HighlightGroup className="flex w-full flex-col gap-2.5">
          {active.list.map((user) => (
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
              key={user.id}
              onNavigate={close}
              user={user}
            />
          ))}
          {active.next ? (
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
    <div className="flex w-full flex-col overflow-hidden">
      <SurfaceSegmentedControl
        ariaLabel="Followers and following"
        id="account-social-tabs"
        items={tabs}
        onChange={setTab}
        value={tab}
      />
      {body}
    </div>
  );
}

export function createAccountSocialSurfaceEntry(
  data: AccountSocialData,
): SurfaceEntry {
  return {
    component: AccountSocialSurface,
    description: SOCIAL_TAB_LABELS[data.tab],
    icon: data.avatarUrl ?? "solar:users-group-rounded-bold",
    props: { data },
    title: data.displayName.trim() || data.username || "Social",
  };
}
