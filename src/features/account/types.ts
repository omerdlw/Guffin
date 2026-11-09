import type { Dispatch, MouseEvent, SetStateAction } from "react";
import type { MutationResult } from "@/features/auth/types";
import type { Database } from "@/lib/supabase/database.types";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MOVIE_LIBRARY_KINDS, SOCIAL_EVENTS } from "./constants";

export interface PublicAccount {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bio: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  isPrivate: boolean;
  username: string;
}

export interface CurrentAccount extends PublicAccount {
  email: string | null;
}

export interface AccountPatchInput {
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  bio?: string | null;
  displayName?: string;
  isPrivate?: boolean | string;
  username?: string;
}

export interface NormalizedAccountPatch {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bio: string | null;
  displayName: string;
  isPrivate: boolean;
  username: string;
}

export interface AccountState {
  account: CurrentAccount | null;
  error: unknown;
  isLoading: boolean;
}

export interface AccountContextValue extends AccountState {
  refresh: () => Promise<void>;
}

interface FollowChange {
  followerId?: string | null;
  followingId: string | null;
  status: string | null;
}

export type AccountRow = Pick<
  Database["public"]["Tables"]["accounts"]["Row"],
  | "avatar_url"
  | "background_url"
  | "bio"
  | "created_at"
  | "display_name"
  | "id"
  | "is_private"
  | "username"
>;

export interface AvatarSource {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
}

export interface KnownAccount {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  id: string | null;
  username: string | null;
}

export type MovieLibraryKind = (typeof MOVIE_LIBRARY_KINDS)[number];

export interface MovieLibraryState {
  liked: boolean;
  watched: boolean;
  watchlist: boolean;
}

export type MovieLibraryResult = MutationResult<{ state: MovieLibraryState }>;

export type DiaryLogResult = MutationResult;

export type FollowStatus = "accepted" | "pending";

export type AccountClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

export type LibraryMarksResult = MutationResult<{
  watched: number[];
  watchlist: number[];
}>;

export interface FollowUser {
  avatarUrl: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  username: string | null;
  viewerStatus?: string | null;
}

export interface FollowCursor {
  before: string;
  beforeId: string;
}

export interface FollowPage {
  items: FollowUser[];
  next: FollowCursor | null;
  total: number | null;
}

export interface NotificationItem {
  actor: {
    avatar_url: string | null;
    display_name: string | null;
    id: string;
    username: string | null;
  } | null;
  created_at: string;
  id: string;
  payload: {
    message?: string;
    subjectTitle?: string;
    targetTitle?: string;
    title?: string;
  } | null;
  read: boolean;
  type: string;
}

export type NotificationFilter = "all" | "unread";

export type NotificationRowAction = (
  id: string,
  event: MouseEvent<HTMLButtonElement>,
) => void;

export interface NotificationFeed {
  items: NotificationItem[];
  status: "failed" | "loading" | "ready";
}

export interface OptimisticChange {
  apply: () => void;
  failure: string;
  request: () => Promise<void>;
  revert: () => void;
}

export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type SetupResult =
  | { success: true; username: string }
  | { error: string; success: false }
  | null;

export interface AccountBioData {
  bio?: string | null;
  displayName?: string;
  username?: string;
}

export type SocialTab = "followers" | "following" | "inbox";

export type SocialAction =
  "accept" | "follow" | "reject" | "remove" | "unfollow";

export interface SocialCollection {
  error: unknown;
  loading: boolean;
  loadingMore: boolean;
  list: FollowUser[];
  next: FollowCursor | null;
  total: number | null;
}

export interface SocialCollectionController {
  loadMore: () => void;
  reload: () => void;
  setState: Dispatch<SetStateAction<SocialCollection>>;
  state: SocialCollection;
}

export interface SocialActionPlan {
  apply: () => () => void;
  failure: string;
  request: () => Promise<void>;
}

export type SocialPageLoader = (
  cursor?: FollowCursor | null,
) => Promise<FollowPage>;

export interface UserActionProps {
  followStatus: string | null;
  onAction: (action: SocialAction, id: string) => void;
  ownProfile: boolean;
  pending: SocialAction | null;
  showFollow: boolean;
  tab: SocialTab;
  userId: string;
}

export interface AccountSocialData {
  avatarUrl?: string;
  canManageRequests?: boolean;
  displayName: string;
  tab: SocialTab;
  userId: string;
  username?: string;
}

declare module "@omerdlw/base-framework/events" {
  interface FrameworkEventMap {
    [SOCIAL_EVENTS.FOLLOW_CHANGE]: FollowChange;
    [SOCIAL_EVENTS.INBOX_CHANGE]: undefined;
    [SOCIAL_EVENTS.NOTIFICATION_CHANGE]: undefined;
  }
}
