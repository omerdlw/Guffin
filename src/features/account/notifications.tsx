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
  DockSurfaceExtension,
  isValidBannerUrl,
  type SurfaceEntry,
  useDockActionClass,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { toUserMessage } from "@omerdlw/base-framework/utils";
import Link from "next/link";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/lib/project";
import { Button, DockAction } from "@/ui/button";
import { HighlightGroup, SegmentedControl, useHighlight } from "@/ui/form";
import { AdaptiveImage, Icon } from "@/ui/media";
import { scrollWithin } from "@/ui/surface";
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
} from "./client";
import {
  NOTIFICATION_BANNER_FADE,
  NOTIFICATION_ICON_BUTTON,
  NOTIFICATION_ICONS,
  NOTIFICATION_TOOLBAR_BUTTON,
  NOTIFICATIONS_ICON,
  NOTIFICATIONS_TITLE,
  SOCIAL_EVENTS,
} from "./constants";
import type {
  NotificationFilter,
  NotificationItem,
  NotificationRowAction,
} from "./types";
import {
  announceChange,
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  headlineOf,
  notificationAge,
  summaryOf,
} from "./utils";
import {
  SURFACE_META,
  SURFACE_SCROLL,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/ui/tokens";

function StatusTile({
  icon,
  meta,
  title,
}: {
  icon: string;
  meta: string;
  title: string;
}) {
  return (
    <div className={`${SURFACE_TILE} w-full`}>
      <div
        className={`center size-10 shrink-0 bg-fill text-ink-muted ${SURFACE_TILE_INNER}`}
      >
        <Icon icon={icon} size={20} />
      </div>
      <div className={SURFACE_TEXT}>
        <p className={SURFACE_TITLE}>{title}</p>
        <p className={SURFACE_META}>{meta}</p>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {Array.from({ length: 4 }, (_, index) => (
        <div className={`${SURFACE_TILE} w-full`} key={index}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`skeleton-block size-10 shrink-0 ${SURFACE_TILE_INNER}`}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <div className="skeleton-block h-3 w-28 rounded-full" />
              <div className="skeleton-block h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div
            className={`skeleton-block size-10 shrink-0 ${SURFACE_TILE_INNER}`}
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
  const highlight = useHighlight(notification.id, "rounded-card bg-fill");
  const href = actor ? accountHref(actor.username || actor.id) : null;
  const headline = headlineOf(notification);
  const age = notificationAge(notification.created_at);

  const content: ReactNode = (
    <>
      <div
        className={`relative size-10 shrink-0 overflow-hidden bg-fill ${SURFACE_TILE_INNER}`}
      >
        {actor ? (
          <AdaptiveImage
            alt={headline}
            className="size-full rounded-[inherit] object-cover"
            onError={(event) =>
              applyAvatarFallback(event, getUserAvatarFallbackUrl(actor))
            }
            src={getUserAvatarUrl(actor)}
            wrapperClassName="size-full rounded-[inherit]"
          />
        ) : (
          <div className="center size-full text-ink-body">
            <Icon
              icon={NOTIFICATION_ICONS[notification.type] ?? NOTIFICATIONS_ICON}
              size={20}
            />
          </div>
        )}
      </div>
      <div className={`${SURFACE_TEXT} h-full`}>
        <span className={SURFACE_TITLE}>{headline}</span>
        <span className={SURFACE_META}>
          {summaryOf(notification)}
          {age ? ` · ${age}` : ""}
        </span>
      </div>
    </>
  );

  return (
    <div
      className={`${SURFACE_TILE} group/user relative isolate w-full justify-between overflow-hidden`}
      {...highlight.props}
    >
      {actor && isValidBannerUrl(actor.banner_url) ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] select-none"
        >
          <div
            className="ui-fade absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 group-hover/user:opacity-40 group-focus-visible/user:opacity-40 group-has-focus-visible/user:opacity-40"
            style={{
              backgroundImage: `url("${actor.banner_url}")`,
              WebkitMaskImage: NOTIFICATION_BANNER_FADE,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        </div>
      ) : null}

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

      <div className="relative z-10 flex shrink-0 items-center gap-1.5">
        {notification.read ? null : (
          <Button
            aria-label="Mark as read"
            className={`${NOTIFICATION_ICON_BUTTON} bg-grade/15 text-grade hover:bg-grade/20 focus-visible:bg-grade/20`}
            onClick={(event) => onMarkRead(notification.id, event)}
            title="Mark as read"
          >
            <Icon icon="solar:check-circle-bold" size={16} />
          </Button>
        )}
        <Button
          aria-label="Delete notification"
          className={`${NOTIFICATION_ICON_BUTTON} text-ink-body hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink`}
          onClick={(event) => onDelete(notification.id, event)}
          title="Delete notification"
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
        </Button>
      </div>
    </div>
  );
});

export function AccountNotificationsSurface({ close }: { close?: () => void }) {
  const auth = useAuth();
  const toast = useToast();
  const signedIn = auth.isReady && auth.isAuthenticated;
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(() => !auth.isReady || signedIn);
  const [failed, setFailed] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const pending = useRef({
    deleted: new Set<string>(),
    read: new Set<string>(),
  });

  const load = useCallback(async () => {
    try {
      const { deleted, read } = pending.current;
      const list = await fetchNotifications();
      setItems(
        list
          .filter((item) => !deleted.has(item.id))
          .map((item) => (read.has(item.id) ? { ...item, read: true } : item)),
      );
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
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

  const optimistic = async (
    apply: () => void,
    revert: () => void,
    request: () => Promise<void>,
    failure: string,
  ) => {
    apply();
    announceChange();
    try {
      await request();
    } catch (error) {
      revert();
      announceChange();
      toast(toUserMessage(error, { fallback: failure }));
    }
  };

  const markRead = useCallback<NotificationRowAction>(
    (id, event) => {
      event.preventDefault();
      event.stopPropagation();
      const setRead = (read: boolean) =>
        setItems((list) =>
          list.map((item) => (item.id === id ? { ...item, read } : item)),
        );
      void optimistic(
        () => {
          pending.current.read.add(id);
          setRead(true);
        },
        () => {
          pending.current.read.delete(id);
          setRead(false);
        },
        () => markAsRead(id),
        "Couldn't update this notification",
      );
    },
    [toast],
  );

  const remove = useCallback<NotificationRowAction>(
    (id, event) => {
      event.preventDefault();
      event.stopPropagation();
      const removed = items.find((item) => item.id === id);
      void optimistic(
        () => {
          pending.current.deleted.add(id);
          setItems((list) => list.filter((item) => item.id !== id));
        },
        () => {
          pending.current.deleted.delete(id);
          if (removed) {
            setItems((list) =>
              list.some((item) => item.id === id) ? list : [...list, removed],
            );
          }
        },
        () => deleteNotification(id),
        "Couldn't delete this notification",
      );
    },
    [items, toast],
  );

  const markAllRead = () => {
    const previous = items;
    const unread = items.filter((item) => !item.read).map((item) => item.id);
    void optimistic(
      () => {
        unread.forEach((id) => pending.current.read.add(id));
        setItems((list) => list.map((item) => ({ ...item, read: true })));
      },
      () => {
        unread.forEach((id) => pending.current.read.delete(id));
        setItems(previous);
      },
      markAllAsRead,
      "Couldn't update your notifications",
    );
  };

  const removeAll = () => {
    const previous = items;
    void optimistic(
      () => {
        previous.forEach((item) => pending.current.deleted.add(item.id));
        setItems([]);
      },
      () => {
        previous.forEach((item) => pending.current.deleted.delete(item.id));
        setItems(previous);
      },
      deleteAllNotifications,
      "Couldn't delete your notifications",
    );
  };

  const unreadCount = items.filter((item) => !item.read).length;
  const visible = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.read) : items),
    [filter, items],
  );

  let body: ReactNode;
  if (loading) {
    body = <ListSkeleton />;
  } else if (failed) {
    body = (
      <StatusTile
        icon="solar:danger-circle-bold"
        meta="Please try again in a moment"
        title="Couldn't load notifications"
      />
    );
  } else if (visible.length === 0) {
    body = (
      <StatusTile
        icon="solar:bell-bold"
        meta={
          filter === "unread"
            ? "You are all caught up"
            : "New followers and activity will appear here"
        }
        title={
          filter === "unread"
            ? "No unread notifications"
            : "No notifications yet"
        }
      />
    );
  } else {
    body = (
      <div
        className={`${SURFACE_SCROLL} max-h-[min(56dvh,26rem)] w-full touch-pan-y`}
        data-scroll-native
        key={filter}
        onWheel={scrollWithin}
      >
        <HighlightGroup className="flex min-h-[48px] w-full flex-col justify-center gap-2.5 overflow-visible">
          {visible.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onDelete={remove}
              onMarkRead={markRead}
              onNavigate={close}
            />
          ))}
        </HighlightGroup>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <DockSurfaceExtension align="left" id="account-notifications-toolbar">
        <div className="flex h-8 w-full items-center justify-between gap-2 select-none">
          <SegmentedControl
            ariaLabel="Filter notifications"
            items={[
              { count: items.length, key: "all", label: "All" },
              { count: unreadCount, key: "unread", label: "Unread" },
            ]}
            onChange={setFilter}
            round
            value={filter}
          />
          {items.length > 0 ? (
            <div className="flex h-full shrink-0 items-center gap-1.5">
              {unreadCount > 0 ? (
                <Button
                  className={NOTIFICATION_TOOLBAR_BUTTON}
                  onClick={markAllRead}
                >
                  <span>Mark read</span>
                </Button>
              ) : null}
              <Button
                className={NOTIFICATION_TOOLBAR_BUTTON}
                onClick={removeAll}
              >
                <span>Clear all</span>
              </Button>
            </div>
          ) : null}
        </div>
      </DockSurfaceExtension>
      {body}
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
            variant: ACTION_TONE_CLASS,
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
