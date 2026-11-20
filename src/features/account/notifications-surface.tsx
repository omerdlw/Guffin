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
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { toUserMessage } from "@omerdlw/base-framework/utils";
import { Icon } from "@/design/components/icon";
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
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/lib/project";
import {
  type NotificationItem,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  parseDate,
  SOCIAL_EVENTS,
} from "./account";
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
} from "./client";
import { AccountAvatarImage, AvatarTile, StatusTile } from "./tiles";

type NotificationFilter = "all" | "unread";

type NotificationRowAction = (
  id: string,
  event: MouseEvent<HTMLButtonElement>,
) => void;

interface NotificationFeed {
  items: NotificationItem[];
  status: "failed" | "loading" | "ready";
}

interface OptimisticChange {
  apply: () => void;
  failure: string;
  request: () => Promise<void>;
  revert: () => void;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  FOLLOW_ACCEPTED: "solar:user-check-bold",
  FOLLOW_REQUEST: "solar:user-plus-bold",
  MENTION: "solar:mention-circle-bold",
  NEW_FOLLOWER: "solar:user-plus-bold",
  SYSTEM_ANNOUNCEMENT: "solar:info-circle-bold",
};

const NOTIFICATION_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

function formatNotificationAge(value: string): string {
  const date = parseDate(value);
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return NOTIFICATION_DATE_FORMAT.format(date);
}

function notificationHeadline({
  actor,
  payload,
  type,
}: NotificationItem): string {
  if (actor) return actor.display_name || actor.username || "Anonymous User";
  if (type === "SYSTEM_ANNOUNCEMENT") {
    return payload?.title || "System Announcement";
  }
  return payload?.title || "Notification";
}

function notificationSummary({ payload, type }: NotificationItem): string {
  const subject = payload?.subjectTitle || payload?.targetTitle;
  switch (type) {
    case "FOLLOW_REQUEST":
      return "Requested to follow you";
    case "FOLLOW_ACCEPTED":
      return "Accepted your follow request";
    case "NEW_FOLLOWER":
      return "Started following you";
    case "MENTION":
      return subject ? `Mentioned you in ${subject}` : "Mentioned you";
    case "SYSTEM_ANNOUNCEMENT":
      return payload?.message || "System announcement";
    default: {
      const message = payload?.message || "Interacted with you";
      return subject ? `${message} in ${subject}` : message;
    }
  }
}

const announceNotificationChange = () =>
  globalEvents.emit(SOCIAL_EVENTS.NOTIFICATION_CHANGE);

function NotificationSkeleton() {
  return (
    <div className={SURFACE_GROUP}>
      {Array.from({ length: 4 }, (_, index) => (
        <div className={groupRowVariants()} key={index}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`${SKELETON.block} size-10 shrink-0 rounded-full`}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <div className={cn(SKELETON.block, "h-3 w-28 rounded-full")} />
              <div className={cn(SKELETON.block, "h-2.5 w-16 rounded-full")} />
            </div>
          </div>
          <div
            className={`${SKELETON.block} size-control-chrome shrink-0 ${SURFACE_TILE_INNER}`}
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
  const highlight = useHighlight(notification.id, GROUP_HIGHLIGHT);
  const href = actor ? accountHref(actor.username || actor.id) : null;
  const headline = notificationHeadline(notification);
  const age = formatNotificationAge(notification.created_at);

  const content: ReactNode = (
    <>
      <span className="relative shrink-0">
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
                icon={
                  NOTIFICATION_ICONS[notification.type] ?? NOTIFICATIONS_ICON
                }
                size={20}
              />
            </div>
          )}
        </AvatarTile>
        {notification.read ? null : (
          <span
            aria-label="Unread"
            className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-grade"
            role="img"
          />
        )}
      </span>
      <div className={`${SURFACE_TEXT} h-full`}>
        <span
          className={cn(
            SURFACE_TITLE,
            notification.read && "font-medium text-ink-body",
          )}
        >
          {headline}
        </span>
        <span className={SURFACE_META}>
          {notificationSummary(notification)}
          {age ? ` · ${age}` : ""}
        </span>
      </div>
    </>
  );

  return (
    <div
      className={groupRowVariants({
        className: "group/user justify-between",
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
  if (status === "loading")
    return (
      <SurfacePart name="item">
        <NotificationSkeleton />
      </SurfacePart>
    );

  if (status === "failed") {
    return (
      <SurfacePart name="note">
        <StatusTile
          description="Please try again in a moment"
          icon="solar:danger-circle-bold"
          title="Couldn't load notifications"
        />
      </SurfacePart>
    );
  }

  if (notifications.length === 0 && query) {
    return (
      <SurfacePart name="note">
        <StatusTile
          description={`Nothing matches “${query}”`}
          icon="solar:magnifer-linear"
          title="No results"
        />
      </SurfacePart>
    );
  }

  if (notifications.length === 0) {
    const unreadOnly = filter === "unread";
    return (
      <SurfacePart name="note">
        <StatusTile
          description={
            unreadOnly
              ? "You are all caught up"
              : "New followers and activity will appear here"
          }
          icon="solar:bell-bold"
          title={
            unreadOnly ? "No unread notifications" : "No notifications yet"
          }
        />
      </SurfacePart>
    );
  }

  return (
    <div
      className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
      data-scroll-native
    >
      <HighlightGroup className={SURFACE_GROUP}>
        <SurfaceSwap
          className="flex min-h-[48px] w-full flex-col justify-center overflow-visible"
          cue="rows"
          id={filter}
        >
          {notifications.map((notification, index) => (
            <SurfacePart index={index} key={notification.id} name="row">
              <NotificationRow
                notification={notification}
                onDelete={onDelete}
                onMarkRead={onMarkRead}
                onNavigate={onClose}
              />
            </SurfacePart>
          ))}
        </SurfaceSwap>
      </HighlightGroup>
    </div>
  );
}

const notificationText = (item: NotificationItem) =>
  `${notificationHeadline(item)} ${notificationSummary(item)} ${item.actor?.username ?? ""}`;

function AccountNotificationsSurface({ close }: { close?: () => void }) {
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
  const query = search.searching ? search.query.trim() : "";
  const view =
    feed.status !== "ready"
      ? feed.status
      : search.matches.length > 0
        ? "list"
        : query
          ? "none"
          : `empty-${filter}`;

  return (
    <SurfaceStage className="flex flex-col overflow-hidden">
      <SurfaceSegmentedControl
        ariaLabel="Filter notifications"
        items={[
          { count: feed.items.length, key: "all", label: "All" },
          { count: unreadCount, key: "unread", label: "Unread" },
        ]}
        onChange={setFilter}
        trailing={
          feed.items.length > 0 ? (
            <>
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
            </>
          ) : null
        }
        value={filter}
      />
      {search.enabled && feed.status === "ready" ? (
        <SurfacePart className="mb-2.5" name="item">
          <SurfaceSearch
            label="Search notifications"
            onChange={search.setQuery}
            value={search.query}
          />
        </SurfacePart>
      ) : null}
      <SurfaceSwap cue="items" id={view}>
        <NotificationList
          filter={filter}
          notifications={search.matches}
          query={query}
          onClose={close}
          onDelete={remove}
          onMarkRead={markRead}
          status={feed.status}
        />
      </SurfaceSwap>
    </SurfaceStage>
  );
}

export const accountNotificationsSurface = defineSurface({
  component: AccountNotificationsSurface,
  description: "Recent activity and alerts",
  icon: NOTIFICATIONS_ICON,
  title: NOTIFICATIONS_TITLE,
});
