"use client";

import {
  type Dispatch,
  type FocusEvent,
  memo,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { toUserMessage, UserError } from "@omerdlw/base-framework/utils";
import { LayoutGroup } from "motion/react";
import Link from "next/link";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/lib/project";
import { Button } from "@/ui/button";
import { SlidingHighlight, SurfaceSegmentedControl } from "@/ui/form";
import { AdaptiveImage, Icon } from "@/ui/media";
import { scrollWithin } from "@/ui/surface";
import { followUserAction, unfollowUserAction } from "./actions";
import {
  acceptFollowRequest,
  fetchFollowers,
  fetchFollowing,
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
import type {
  AccountSocialData,
  FollowUser,
  SocialAction,
  SocialCollection,
  SocialPageLoader,
  SocialTab,
  UserActionProps,
} from "./types";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  socialErrorMessage,
  withoutUser,
} from "./utils";
import {
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/ui/tokens";

const loadRequests: SocialPageLoader = async () => ({
  items: await fetchFollowRequests(),
  next: null,
  total: null,
});

function useCollection(
  load: SocialPageLoader,
  enabled: boolean,
): [
  SocialCollection,
  Dispatch<SetStateAction<SocialCollection>>,
  () => void,
  () => void,
] {
  const [state, setState] = useState<SocialCollection>({
    error: null,
    list: [],
    loading: enabled,
    loadingMore: false,
    next: null,
    total: null,
  });
  const request = useRef(0);
  const loadingMore = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
      return;
    }
    const id = ++request.current;
    setState((s) => ({ ...s, error: null, loading: s.list.length === 0 }));
    try {
      const page = await load();
      if (id !== request.current) return;
      setState({
        error: null,
        list: page.items,
        loading: false,
        loadingMore: false,
        next: page.next,
        total: page.total,
      });
    } catch (error) {
      if (id === request.current) {
        setState((s) => ({ ...s, error, loading: false }));
      }
    }
  }, [enabled, load]);

  const loadMore = useCallback(async () => {
    const cursor = state.next;
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    const id = request.current;
    setState((s) => ({ ...s, loadingMore: true }));
    try {
      const page = await load(cursor);
      if (id !== request.current) return;
      setState((s) => {
        const known = new Set(s.list.map((user) => user.id));
        return {
          ...s,
          list: [
            ...s.list,
            ...page.items.filter((user) => !known.has(user.id)),
          ],
          loadingMore: false,
          next: page.next,
        };
      });
    } catch {
      setState((s) => ({ ...s, loadingMore: false }));
    } finally {
      loadingMore.current = false;
    }
  }, [load, state.next]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return [state, setState, reload, loadMore];
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

function StatusTile({
  description,
  icon,
  title,
}: {
  description: string;
  icon: string;
  title: string;
}) {
  return (
    <div className={SOCIAL_ROW}>
      <div
        className={`center size-10 shrink-0 bg-fill text-ink-muted ${SURFACE_TILE_INNER}`}
      >
        <Icon icon={icon} size={18} />
      </div>
      <div className={SURFACE_TEXT}>
        <p className={SURFACE_TITLE}>{title}</p>
        <p className={SURFACE_META}>{description}</p>
      </div>
    </div>
  );
}

const UserRow = memo(function UserRow({
  action,
  highlighted,
  onBlur,
  onFocus,
  onNavigate,
  onPointerEnter,
  user,
}: {
  action: ReactNode;
  highlighted: boolean;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onNavigate?: () => void;
  onPointerEnter: () => void;
  user: FollowUser;
}) {
  return (
    <div
      className={`${SOCIAL_ROW} relative isolate group/user`}
      onBlur={onBlur}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
    >
      {highlighted ? (
        <SlidingHighlight layoutId="account-social-row-highlight" />
      ) : null}
      <Link
        className={`relative z-10 flex h-full min-w-0 flex-1 items-center gap-3 ${SURFACE_TILE_INNER}`}
        href={accountHref(user.username || user.id)}
        onClick={onNavigate}
      >
        <div
          className={`relative size-10 shrink-0 overflow-hidden bg-fill ${SURFACE_TILE_INNER}`}
        >
          <AdaptiveImage
            alt={user.displayName}
            className="size-full rounded-[inherit] object-cover"
            onError={(event) =>
              applyAvatarFallback(event, getUserAvatarFallbackUrl(user))
            }
            src={getUserAvatarUrl(user)}
            wrapperClassName="size-full rounded-[inherit]"
          />
        </div>
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

function AccountSocialSurface({
  close,
  data,
}: {
  close?: () => void;
  data: AccountSocialData;
}) {
  const highlightGroupId = useId();
  const auth = useAuth();
  const toast = useToast();
  const viewerId = auth.user?.id ?? null;
  const userId = data.userId;
  const ownProfile = viewerId !== null && viewerId === userId;
  const canManageRequests = Boolean(data.canManageRequests) || ownProfile;
  const signedIn = auth.isReady && auth.isAuthenticated && viewerId !== null;

  const [tab, setTab] = useState<SocialTab>(data.tab);
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, SocialAction>>({});
  const [followStatus, setFollowStatus] = useState<Record<string, string>>({});

  const loadFollowers = useCallback<SocialPageLoader>(
    (cursor) => fetchFollowers(userId, cursor),
    [userId],
  );
  const loadFollowing = useCallback<SocialPageLoader>(
    (cursor) => fetchFollowing(userId, cursor),
    [userId],
  );
  const [followers, setFollowers, reloadFollowers, moreFollowers] =
    useCollection(loadFollowers, Boolean(userId));
  const [following, setFollowing, reloadFollowing, moreFollowing] =
    useCollection(loadFollowing, Boolean(userId));
  const [requests, setRequests, reloadRequests] = useCollection(
    loadRequests,
    canManageRequests && signedIn,
  );

  const [seenLists, setSeenLists] = useState([followers.list, following.list]);
  if (seenLists[0] !== followers.list || seenLists[1] !== following.list) {
    setSeenLists([followers.list, following.list]);
    setFollowStatus((statuses) => {
      const next = { ...statuses };
      for (const user of [...followers.list, ...following.list]) {
        next[user.id] = user.viewerStatus || "";
      }
      return next;
    });
  }

  useGlobalEvent(
    SOCIAL_EVENTS.FOLLOW_CHANGE,
    () => {
      reloadFollowers();
      reloadFollowing();
    },
    { debounceMs: 250 },
  );
  useGlobalEvent(
    SOCIAL_EVENTS.INBOX_CHANGE,
    () => {
      if (canManageRequests && viewerId) reloadRequests();
    },
    { debounceMs: 250 },
  );

  const run = useCallback(
    async (
      id: string,
      action: SocialAction,
      request: () => Promise<void>,
      failure: string,
      apply: () => () => void,
    ) => {
      if (!viewerId || pending[id]) return;
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
    [pending, toast, viewerId],
  );

  const snapshot = <T,>(
    setter: Dispatch<SetStateAction<T>>,
    change: (value: T) => T,
  ) => {
    let previous: T | undefined;
    setter((value) => {
      previous = value;
      return change(value);
    });
    return () => {
      if (previous !== undefined) setter(previous as T);
    };
  };

  const handleAction = useCallback(
    (action: SocialAction, id: string) => {
      switch (action) {
        case "accept":
          return run(
            id,
            action,
            async () => {
              await acceptFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: "accepted",
              });
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
            "Couldn't accept this request",
            () => snapshot(setRequests, (s) => withoutUser(s, id)),
          );
        case "reject":
          return run(
            id,
            action,
            async () => {
              await rejectFollowRequest(id);
              globalEvents.emit(SOCIAL_EVENTS.INBOX_CHANGE);
            },
            "Couldn't decline this request",
            () => snapshot(setRequests, (s) => withoutUser(s, id)),
          );
        case "remove":
          return run(
            id,
            action,
            async () => {
              await removeFollower(id);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: viewerId,
                status: null,
              });
            },
            "Couldn't remove this follower",
            () => snapshot(setFollowers, (s) => withoutUser(s, id)),
          );
        case "unfollow":
          return run(
            id,
            action,
            async () => {
              const result = await unfollowUserAction(id);
              if (!result.success) throw new UserError(result.error);
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status: null,
              });
            },
            "Couldn't unfollow this account",
            () => {
              const revertStatus = snapshot(
                setFollowStatus,
                ({ [id]: _, ...rest }) => rest,
              );
              const revertList = ownProfile
                ? snapshot(setFollowing, (s) => withoutUser(s, id))
                : () => {};
              return () => {
                revertStatus();
                revertList();
              };
            },
          );
        case "follow":
          return run(
            id,
            action,
            async () => {
              const result = await followUserAction(id);
              if (!result.success) throw new UserError(result.error);
              const status = result.data;
              setFollowStatus((current) => ({ ...current, [id]: status }));
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followingId: id,
                status,
              });
            },
            "Couldn't follow this account",
            () =>
              snapshot(setFollowStatus, (current) => ({
                ...current,
                [id]: "accepted",
              })),
          );
      }
    },
    [ownProfile, run, setFollowers, setFollowing, setRequests, viewerId],
  );

  const showInbox =
    canManageRequests &&
    (requests.loading || requests.list.length > 0 || Boolean(requests.error));

  const tabs = useMemo(
    () => [
      {
        count: following.total ?? following.list.length,
        key: "following" as const,
        label: "Following",
      },
      {
        count: followers.total ?? followers.list.length,
        key: "followers" as const,
        label: "Followers",
      },
      ...(showInbox
        ? [
            {
              count: requests.list.length,
              key: "inbox" as const,
              label: "Inbox",
            },
          ]
        : []),
    ],
    [followers, following, requests.list.length, showInbox],
  );

  const active =
    tab === "inbox" ? requests : tab === "following" ? following : followers;
  const loadMore =
    tab === "following"
      ? moreFollowing
      : tab === "followers"
        ? moreFollowers
        : null;

  let body: ReactNode;
  if (active.loading) {
    body = (
      <div className="flex w-full flex-col gap-2.5">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingRow key={index} />
        ))}
      </div>
    );
  } else if (active.error) {
    body = (
      <StatusTile
        description={socialErrorMessage(active.error, tab)}
        icon="solar:danger-circle-bold"
        title={`Couldn't load ${tab}`}
      />
    );
  } else if (active.list.length === 0) {
    body = (
      <StatusTile
        description={
          tab === "inbox"
            ? "Incoming follow requests will appear here"
            : `No ${tab} yet for this account`
        }
        icon={
          tab === "inbox"
            ? "solar:inbox-line-bold"
            : "solar:users-group-rounded-bold"
        }
        title={tab === "inbox" ? "No pending follow requests" : `No ${tab} yet`}
      />
    );
  } else {
    body = (
      <div
        className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
        data-scroll-native
        key={tab}
        onPointerLeave={() => setHoveredUserId(null)}
        onWheel={scrollWithin}
      >
        <LayoutGroup id={`account-social-${highlightGroupId}-${tab}`}>
          <div className="flex w-full flex-col gap-2.5">
            {active.list.map((user) => (
              <UserRow
                action={
                  <UserAction
                    followStatus={followStatus[user.id] || null}
                    onAction={handleAction}
                    ownProfile={ownProfile}
                    pending={pending[user.id] ?? null}
                    showFollow={viewerId !== null && viewerId !== user.id}
                    tab={tab}
                    userId={user.id}
                  />
                }
                highlighted={(hoveredUserId ?? focusedUserId) === user.id}
                key={user.id}
                onBlur={(event) => {
                  if (
                    !(event.relatedTarget instanceof Node) ||
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    setFocusedUserId(null);
                  }
                }}
                onFocus={() => setFocusedUserId(user.id)}
                onNavigate={close}
                onPointerEnter={() => setHoveredUserId(user.id)}
                user={user}
              />
            ))}
            {active.next && loadMore ? (
              <LoadMoreSentinel
                loading={active.loadingMore}
                onVisible={loadMore}
              />
            ) : null}
          </div>
        </LayoutGroup>
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
