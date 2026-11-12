"use client";

import {
  memo,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  DockSurfaceExtension,
  type SurfaceEntry,
  useDockActionClass,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { ACTION_TONE } from "@/design/foundations/tones";
import { toUserMessage } from "@omerdlw/base-framework/utils";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/lib/project";
import { Link } from "@/design/components/link";
import { Button } from "@/design/components/button";
import {
  HighlightGroup,
  useHighlight,
} from "@/design/components/highlight-group";
import { Icon } from "@/design/components/icon";
import { SegmentedControl } from "@/design/components/segmented-control";
import { SKELETON } from "@/design/components/skeleton";
import {
  DockAction,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  SurfaceAnchor,
  SurfaceSearch,
  tileVariants,
  useSurfaceSearch,
} from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
} from "./client";
import {
  NOTIFICATION_ICONS,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SOCIAL_EVENTS,
} from "./constants";
import { AccountAvatarImage, AvatarTile, StatusTile } from "./tiles";
import type {
  NotificationFeed,
  NotificationFilter,
  NotificationItem,
  NotificationRowAction,
  OptimisticChange,
} from "./types";
import {
  announceNotificationChange,
  formatNotificationAge,
  notificationHeadline,
  notificationSummary,
} from "./utils";

function NotificationSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: 4 }, (_, index) => (
        <div className={tileVariants({ className: "w-full" })} key={index}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`${SKELETON.block} size-10 shrink-0 ${SURFACE_TILE_INNER}`}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <div className={cn(SKELETON.block, "h-3 w-28 rounded-full")} />
              <div className={cn(SKELETON.block, "h-2.5 w-16 rounded-full")} />
            </div>
          </div>
          <div
            className={`${SKELETON.block} size-10 shrink-0 ${SURFACE_TILE_INNER}`}
          />
        </div>
      ))}
    </div>
  );
}

const NotificationRow = memo(function NotificationRow({
  notification,
  onDelete,
  onMarkRead,
  onNavigate,
}: {
  notification: NotificationItem;
  onDelete: NotificationRowAction;
  onMarkRead: NotificationRowAction;
  onNavigate?: () => void;
}) {
  const { actor } = notification;
  const highlight = useHighlight(notification.id);
  const href = actor ? accountHref(actor.username || actor.id) : null;
  const headline = notificationHeadline(notification);
  const age = formatNotificationAge(notification.created_at);

  const content: ReactNode = (
    <>
      <AvatarTile>
        {actor ? (
          <AccountAvatarImage
            account={{
              avatarUrl: actor.avatar_url,
              displayName: actor.display_name,
              username: actor.username,
            }}
            alt={headline}
          />
        ) : (
          <div className="center size-full text-ink-body">
            <Icon
              icon={NOTIFICATION_ICONS[notification.type] ?? NOTIFICATIONS_ICON}
              size={20}
            />
          </div>
        )}
      </AvatarTile>
      <div className={`${SURFACE_TEXT} h-full`}>
        <span className={SURFACE_TITLE}>{headline}</span>
        <span className={SURFACE_META}>
          {notificationSummary(notification)}
          {age ? ` · ${age}` : ""}
        </span>
      </div>
    </>
  );

  return (
    <div
      className={tileVariants({
        className: "group/user relative isolate w-full justify-between",
      })}
      {...highlight.props}
    >
      {highlight.node}

      {href ? (
        <Link
          className={`relative z-10 flex h-full min-w-0 flex-1 items-center gap-3 ${SURFACE_TILE_INNER}`}
          href={href}
          onClick={onNavigate}
        >
          {content}
        </Link>
      ) : (
        <div className="relative z-10 flex h-full min-w-0 flex-1 items-center gap-3">
          {content}
        </div>
      )}

      <div className="relative z-10 flex shrink-0 items-center gap-0.5">
        {notification.read ? null : (
          <Button
            aria-label="Mark as read"
            className={SURFACE_TILE_INNER}
            icon
            intent="ghost"
            size="chrome"
            onClick={(event) => onMarkRead(notification.id, event)}
            title="Mark as read"
          >
            <Icon icon="solar:check-read-linear" size={18} />
          </Button>
        )}
        <Button
          aria-label="Delete notification"
          className={SURFACE_TILE_INNER}
          icon
          intent="ghost"
          size="chrome"
          onClick={(event) => onDelete(notification.id, event)}
          title="Delete notification"
        >
          <Icon icon="solar:trash-bin-minimalistic-linear" size={18} />
        </Button>
      </div>
    </div>
  );
});

function swallowClick(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function useNotificationFeed(signedIn: boolean, ready: boolean) {
  const toast = useToast();
  const [feed, setFeed] = useState<NotificationFeed>({
    items: [],
    status: !ready || signedIn ? "loading" : "ready",
  });
  const optimisticIds = useRef({
    deleted: new Set<string>(),
    read: new Set<string>(),
  });

  const updateItems = useCallback(
    (update: (items: NotificationItem[]) => NotificationItem[]) =>
      setFeed((current) => ({ ...current, items: update(current.items) })),
    [],
  );

  const load = useCallback(async () => {
    try {
      const { deleted, read } = optimisticIds.current;
      const items = (await fetchNotifications())
        .filter((item) => !deleted.has(item.id))
        .map((item) => (read.has(item.id) ? { ...item, read: true } : item));
      setFeed({ items, status: "ready" });
    } catch {
      setFeed((current) => ({ ...current, status: "failed" }));
    }
  }, []);

  useEffect(() => {
    if (signedIn) void load();
  }, [load, signedIn]);

  useGlobalEvent(
    SOCIAL_EVENTS.NOTIFICATION_CHANGE,
    () => {
      if (signedIn) void load();
    },
    { debounceMs: 150 },
  );

  const applyOptimistically = useCallback(
    async ({ apply, failure, request, revert }: OptimisticChange) => {
      apply();
      announceNotificationChange();
      try {
        await request();
      } catch (error) {
        revert();
        announceNotificationChange();
        toast(toUserMessage(error, { fallback: failure }));
      }
    },
    [toast],
  );

  const markRead = useCallback<NotificationRowAction>(
    (id, event) => {
      swallowClick(event);
      const setRead = (read: boolean) =>
        updateItems((items) =>
          items.map((item) => (item.id === id ? { ...item, read } : item)),
        );
      void applyOptimistically({
        apply: () => {
          optimisticIds.current.read.add(id);
          setRead(true);
        },
        failure: "Couldn't update this notification",
        request: () => markAsRead(id),
        revert: () => {
          optimisticIds.current.read.delete(id);
          setRead(false);
        },
      });
    },
    [applyOptimistically, updateItems],
  );

  const remove = useCallback<NotificationRowAction>(
    (id, event) => {
      swallowClick(event);
      const removed = feed.items.find((item) => item.id === id);
      void applyOptimistically({
        apply: () => {
          optimisticIds.current.deleted.add(id);
          updateItems((items) => items.filter((item) => item.id !== id));
        },
        failure: "Couldn't delete this notification",
        request: () => deleteNotification(id),
        revert: () => {
          optimisticIds.current.deleted.delete(id);
          if (!removed) return;
          updateItems((items) =>
            items.some((item) => item.id === id) ? items : [...items, removed],
          );
        },
      });
    },
    [applyOptimistically, feed.items, updateItems],
  );

  const markAllRead = () => {
    const previous = feed.items;
    const unreadIds = previous.filter((item) => !item.read).map(({ id }) => id);
    void applyOptimistically({
      apply: () => {
        unreadIds.forEach((id) => optimisticIds.current.read.add(id));
        updateItems((items) => items.map((item) => ({ ...item, read: true })));
      },
      failure: "Couldn't update your notifications",
      request: markAllAsRead,
      revert: () => {
        unreadIds.forEach((id) => optimisticIds.current.read.delete(id));
        updateItems(() => previous);
      },
    });
  };

  const removeAll = () => {
    const previous = feed.items;
    void applyOptimistically({
      apply: () => {
        previous.forEach((item) => optimisticIds.current.deleted.add(item.id));
        updateItems(() => []);
      },
      failure: "Couldn't delete your notifications",
      request: deleteAllNotifications,
      revert: () => {
        previous.forEach((item) =>
          optimisticIds.current.deleted.delete(item.id),
        );
        updateItems(() => previous);
      },
    });
  };

  return { feed, markAllRead, markRead, remove, removeAll };
}

function NotificationList({
  filter,
  notifications,
  query,
  onClose,
  onDelete,
  onMarkRead,
  status,
}: {
  filter: NotificationFilter;
  notifications: readonly NotificationItem[];
  onClose?: () => void;
  query: string;
  onDelete: NotificationRowAction;
  onMarkRead: NotificationRowAction;
  status: NotificationFeed["status"];
}) {
  if (status === "loading") return <NotificationSkeleton />;

  if (status === "failed") {
    return (
      <StatusTile
        description="Please try again in a moment"
        icon="solar:danger-circle-bold"
        title="Couldn't load notifications"
      />
    );
  }

  if (notifications.length === 0 && query) {
    return (
      <StatusTile
        description={`Nothing matches “${query}”`}
        icon="solar:magnifer-linear"
        title="No results"
      />
    );
  }

  if (notifications.length === 0) {
    const unreadOnly = filter === "unread";
    return (
      <StatusTile
        description={
          unreadOnly
            ? "You are all caught up"
            : "New followers and activity will appear here"
        }
        icon="solar:bell-bold"
        title={unreadOnly ? "No unread notifications" : "No notifications yet"}
      />
    );
  }

  return (
    <div
      className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
      data-scroll-native
      key={filter}
    >
      <HighlightGroup className="flex min-h-[48px] w-full flex-col justify-center gap-2.5 overflow-visible">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onDelete={onDelete}
            onMarkRead={onMarkRead}
            onNavigate={onClose}
          />
        ))}
      </HighlightGroup>
    </div>
  );
}

const notificationText = (item: NotificationItem) =>
  `${notificationHeadline(item)} ${notificationSummary(item)} ${item.actor?.username ?? ""}`;

export function AccountNotificationsSurface({ close }: { close?: () => void }) {
  const auth = useAuth();
  const signedIn = auth.isReady && auth.isAuthenticated;
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { feed, markAllRead, markRead, remove, removeAll } =
    useNotificationFeed(signedIn, auth.isReady);

  const unreadCount = feed.items.filter((item) => !item.read).length;
  const visible = useMemo(
    () =>
      filter === "unread"
        ? feed.items.filter((item) => !item.read)
        : feed.items,
    [feed.items, filter],
  );

  const search = useSurfaceSearch(visible, notificationText, feed.items.length);

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <SurfaceAnchor />
      <DockSurfaceExtension align="left" id="account-notifications-toolbar">
        <div className="flex h-8 w-full items-center justify-between gap-2 select-none">
          <SegmentedControl
            ariaLabel="Filter notifications"
            items={[
              { count: feed.items.length, key: "all", label: "All" },
              { count: unreadCount, key: "unread", label: "Unread" },
            ]}
            onChange={setFilter}
            value={filter}
          />
          {feed.items.length > 0 ? (
            <div className="flex h-full shrink-0 items-center gap-1.5">
              {unreadCount > 0 ? (
                <Button
                  intent="ghost"
                  shape="pill"
                  size="sm"
                  onClick={markAllRead}
                >
                  <span>Mark read</span>
                </Button>
              ) : null}
              <Button intent="ghost" shape="pill" size="sm" onClick={removeAll}>
                <span>Clear all</span>
              </Button>
            </div>
          ) : null}
        </div>
      </DockSurfaceExtension>
      {search.enabled && feed.status === "ready" ? (
        <SurfaceSearch
          className="mb-2.5"
          label="Search notifications"
          onChange={search.setQuery}
          value={search.query}
        />
      ) : null}
      <NotificationList
        filter={filter}
        notifications={search.matches}
        query={search.searching ? search.query.trim() : ""}
        onClose={close}
        onDelete={remove}
        onMarkRead={markRead}
        status={feed.status}
      />
    </div>
  );
}

export function createAccountNotificationsSurfaceEntry(): SurfaceEntry {
  return {
    component: AccountNotificationsSurface,
    description: "Recent activity and alerts",
    icon: NOTIFICATIONS_ICON,
    title: NOTIFICATIONS_TITLE,
  };
}

export function AccountInboxAction({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  const actionClass = useDockActionClass();
  return (
    <DockAction>
      <div className="flex items-center gap-2">
        <Button
          aria-label={`Inbox with ${count} pending requests`}
          className={actionClass({
            className: "disabled:cursor-not-allowed disabled:opacity-50",
            variant: ACTION_TONE,
          })}
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <Icon icon="solar:inbox-bold" size={16} />
          <span>Inbox {count}</span>
        </Button>
      </div>
    </DockAction>
  );
}
