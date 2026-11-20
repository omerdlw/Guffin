import { requestJson } from "@/lib/http";
import {
  type CurrentAccount,
  FOLLOWS_URL,
  type NotificationItem,
  SILENT_UNAUTHORIZED,
} from "./account";

const NOTIFICATIONS_URL = "/api/notifications";

function shareInFlight<T>(load: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => (inFlight ??= load().finally(() => (inFlight = null)));
}

export function sendJson(
  url: string,
  method: "DELETE" | "PATCH",
  body: object,
): Promise<unknown> {
  return requestJson(url, { body: JSON.stringify(body), method });
}

export async function respondToFollow(
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

export const fetchInboxCount = shareInFlight(async () => {
  const response = await requestJson<{ count?: number }>(
    `${FOLLOWS_URL}?resource=inbox-count`,
    SILENT_UNAUTHORIZED,
  ).catch(() => ({ count: 0 }));
  return Number(response.count) || 0;
});

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
