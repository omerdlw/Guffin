import { requestJson } from "@/lib/http";
import {
  FOLLOWS_URL,
  NOTIFICATIONS_URL,
  SILENT_READ,
  SILENT_UNAUTHORIZED,
} from "./constants";
import type {
  CurrentAccount,
  FollowCursor,
  FollowPage,
  FollowUser,
  NotificationItem,
} from "./types";

function shareInFlight<T>(load: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => (inFlight ??= load().finally(() => (inFlight = null)));
}

function sendJson(
  url: string,
  method: "DELETE" | "PATCH",
  body: object,
): Promise<unknown> {
  return requestJson(url, { body: JSON.stringify(body), method });
}

async function respondToFollow(
  action: "accept" | "reject",
  requesterId: string,
): Promise<void> {
  if (!requesterId) throw new Error("Requester ID is required");
  await sendJson(FOLLOWS_URL, "PATCH", { action, requesterId });
}

export async function fetchCurrentAccount(): Promise<CurrentAccount | null> {
  const response = await requestJson<{ account: CurrentAccount | null }>(
    "/api/account/me",
    SILENT_UNAUTHORIZED,
  );
  return response.account;
}

export async function getFollowState(
  followingId: string,
): Promise<string | null> {
  const response = await requestJson<{ status?: string | null }>(
    `${FOLLOWS_URL}?followingId=${encodeURIComponent(followingId)}`,
    SILENT_UNAUTHORIZED,
  );
  return response.status || null;
}

export async function removeFollower(followerId: string): Promise<void> {
  if (!followerId) throw new Error("Follower ID is required");
  await sendJson(FOLLOWS_URL, "DELETE", { followerId });
}

export const acceptFollowRequest = (requesterId: string) =>
  respondToFollow("accept", requesterId);

export const rejectFollowRequest = (requesterId: string) =>
  respondToFollow("reject", requesterId);

export const fetchInboxCount = shareInFlight(async () => {
  const response = await requestJson<{ count?: number }>(
    `${FOLLOWS_URL}?resource=inbox-count`,
    SILENT_UNAUTHORIZED,
  ).catch(() => ({ count: 0 }));
  return Number(response.count) || 0;
});

export async function fetchFollowRequests(): Promise<FollowUser[]> {
  const response = await requestJson<{ data: FollowUser[] }>(
    `${FOLLOWS_URL}?resource=requests`,
    SILENT_READ,
  );
  return response.data;
}

export async function fetchFollowPage(
  resource: "followers" | "following",
  userId?: string | null,
  cursor?: FollowCursor | null,
): Promise<FollowPage> {
  const query = new URLSearchParams({ resource });
  if (userId) query.set("userId", userId);
  if (cursor) {
    query.set("before", cursor.before);
    query.set("beforeId", cursor.beforeId);
  }
  const response = await requestJson<{
    data: FollowUser[];
    next: FollowCursor | null;
    total: number | null;
  }>(`${FOLLOWS_URL}?${query}`, SILENT_READ);
  return { items: response.data, next: response.next, total: response.total };
}

export async function fetchNotifications(
  limit = 50,
): Promise<NotificationItem[]> {
  const response = await requestJson<{ data: NotificationItem[] }>(
    `${NOTIFICATIONS_URL}?limitCount=${limit}`,
    { notifyOnError: false },
  );
  return response.data;
}

export const fetchUnreadCount = shareInFlight(async () => {
  const response = await requestJson<{ data?: number }>(
    `${NOTIFICATIONS_URL}?resource=unread-count`,
    SILENT_UNAUTHORIZED,
  ).catch(() => ({ data: 0 }));
  return Number(response.data) || 0;
});

export async function markAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  await sendJson(NOTIFICATIONS_URL, "PATCH", {
    action: "mark-read",
    notificationId,
  });
}

export async function markAllAsRead(): Promise<void> {
  await sendJson(NOTIFICATIONS_URL, "PATCH", { action: "mark-all-read" });
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  if (!notificationId) return;
  await requestJson(
    `${NOTIFICATIONS_URL}?action=delete&notificationId=${encodeURIComponent(notificationId)}`,
    { method: "DELETE" },
  );
}

export async function deleteAllNotifications(): Promise<void> {
  await requestJson(`${NOTIFICATIONS_URL}?action=delete-all`, {
    method: "DELETE",
  });
}
