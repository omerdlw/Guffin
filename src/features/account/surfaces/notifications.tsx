"use client";

import {
  type CSSProperties,
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
} from "@/design/surface/surface";
import {
  GROUP_HIGHLIGHT,
  groupRowVariants,
  SURFACE_GROUP,
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/design/surface/classes";
import { TONE } from "@/design/foundations/tones";
import { defineSurface } from "@/design/surface/define";
import { cn } from "@/design/ui";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/shared/site";
import {
  type NotificationItem,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  parseDate,
  SOCIAL_EVENTS,
} from "../model";
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
} from "../api";
import {
  AccountAvatarImage,
  AvatarTile,
  StatusTile,
} from "../components/tiles";

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

const KIND_TONE = {
  follow: "bg-ink text-on-primary",
  like: "bg-liked text-on-accent",
  talk: "bg-listed text-on-accent",
} as const;

const NOTIFICATION_KINDS: Record<
  string,
  { icon: string; tone: keyof typeof KIND_TONE }
> = {
  FOLLOW_ACCEPTED: { icon: "solar:user-check-bold", tone: "follow" },
  FOLLOW_REQUEST: { icon: "solar:user-plus-bold", tone: "follow" },
  LIST_COMMENT: { icon: "solar:chat-round-bold", tone: "talk" },
  LIST_LIKE: { icon: "solar:heart-bold", tone: "like" },
  MENTION: { icon: "solar:mention-circle-bold", tone: "talk" },
  NEW_FOLLOWER: { icon: "solar:user-plus-bold", tone: "follow" },
  REVIEW_LIKE: { icon: "solar:heart-bold", tone: "like" },
};

const AVATAR = 40;
const BADGE = 20;
const BADGE_GAP = 2;
const BADGE_SPILL = 3;
const BADGE_CENTRE = BADGE / 2 - BADGE_SPILL;
const BADGE_CUT: CSSProperties = (() => {
  const mask = `radial-gradient(circle at calc(100% - ${BADGE_CENTRE}px) calc(100% - ${BADGE_CENTRE}px), transparent ${BADGE / 2 + BADGE_GAP}px, #000 ${BADGE / 2 + BADGE_GAP + 0.5}px)`;
  return { WebkitMaskImage: mask, maskImage: mask };
})();

const DAY = 86400000;

const DAY_GROUPS = [
  { key: "today", label: "Today", within: 1 },
  { key: "week", label: "This week", within: 7 },
  { key: "month", label: "This month", within: 31 },
  { key: "earlier", label: "Earlier", within: Infinity },
] as const;

function dayGroupOf(value: string): (typeof DAY_GROUPS)[number]["key"] {
  const date = parseDate(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = date ? (start.getTime() - date.getTime()) / DAY + 1 : Infinity;
  return (DAY_GROUPS.find((group) => days <= group.within) ?? DAY_GROUPS[3])
    .key;
}

const NOTIFICATION_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

function formatNotificationAge(value: string): string {
  const date = parseDate(value);
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
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
            className={cn(
              SKELETON.block,
              "mr-2 h-2.5 w-7 shrink-0 rounded-full",
            )}
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

  const kind = NOTIFICATION_KINDS[notification.type];

  const content: ReactNode = (
    <>
      <span className="relative shrink-0" style={{ width: AVATAR }}>
        <span className="block" style={kind && actor ? BADGE_CUT : undefined}>
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
        </span>
        {kind && actor ? (
          <span
            aria-hidden="true"
            className={cn("center absolute rounded-full", KIND_TONE[kind.tone])}
            style={{
              bottom: -BADGE_SPILL,
              height: BADGE,
              right: -BADGE_SPILL,
              width: BADGE,
            }}
          >
            <Icon icon={kind.icon} size={12} />
          </span>
        ) : null}
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

      <div className="relative z-10 grid shrink-0 items-center justify-items-end *:col-start-1 *:row-start-1">
        <span className="ui-fade flex items-center gap-2 pr-2 type-meta text-ink-muted tabular-nums group-hover/user:opacity-0 pointer-coarse:hidden">
          {age}
          {notification.read ? null : (
            <span
              aria-label="Unread"
              className="size-2 rounded-full bg-grade"
              role="img"
            />
          )}
        </span>
        <div className="ui-fade pointer-events-none flex items-center gap-0.5 opacity-0 group-hover/user:pointer-events-auto group-hover/user:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100">
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
      <SurfaceSwap className="flex flex-col gap-4" cue="rows" id={filter}>
        {groupByDay(notifications).map((group, index) => (
          <SurfacePart
            className="flex flex-col gap-2"
            index={index}
            key={group.key}
            name="row"
          >
            <p className={cn(TONE.label, "px-3 text-ink-muted")}>
              {group.label}
            </p>
            <HighlightGroup className={SURFACE_GROUP}>
              {group.items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onDelete={onDelete}
                  onMarkRead={onMarkRead}
                  onNavigate={onClose}
                />
              ))}
            </HighlightGroup>
          </SurfacePart>
        ))}
      </SurfaceSwap>
    </div>
  );
}

function groupByDay(items: readonly NotificationItem[]) {
  const buckets = new Map<string, NotificationItem[]>();
  for (const item of items) {
    const key = dayGroupOf(item.created_at);
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  return DAY_GROUPS.filter((group) => buckets.has(group.key)).map((group) => ({
    ...group,
    items: buckets.get(group.key)!,
  }));
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
    <SurfaceStage className="flex flex-col overflow-clip [overflow-clip-margin:var(--spacing-swell)]">
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
              <Button
                aria-label="Mark all as read"
                disabled={unreadCount === 0}
                icon
                intent="neutral"
                onClick={markAllRead}
                shape="pill"
                size="sm"
                title="Mark all as read"
              >
                <Icon icon="solar:check-read-linear" size={16} />
              </Button>
              <Button
                aria-label="Clear all notifications"
                icon
                intent="neutral"
                onClick={removeAll}
                shape="pill"
                size="sm"
                title="Clear all"
              >
                <Icon icon="solar:trash-bin-minimalistic-linear" size={16} />
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
