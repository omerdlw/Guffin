import { FOLLOWS_URL, SILENT_UNAUTHORIZED } from "@/features/account/account";
import { respondToFollow, sendJson } from "@/features/account/client";
import { requestJson } from "@/lib/http";
import type { FollowUser } from "./social";

export interface FollowCursor {
  before: string;
  beforeId: string;
}

export interface FollowPage {
  items: FollowUser[];
  next: FollowCursor | null;
  total: number | null;
}

const SILENT_READ = {
  notifyOnError: false,
  notifyOnUnauthorized: false,
} as const;

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
