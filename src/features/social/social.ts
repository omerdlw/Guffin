import type { FollowCursor, FollowPage } from "./client";

export interface SocialPerson {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  username: string;
}

export interface Friend extends SocialPerson {
  liked: boolean;
  rating: number | null;
  reviewed: boolean;
  watched: boolean;
  watchlisted: boolean;
}

export interface MovieSocialProof {
  averageRating: number | null;
  counts: {
    liked: number;
    ratings: number;
    reviews: number;
    watched: number;
    watchlist: number;
  };
  friends: Friend[];
  total: number;
}

export interface MutualFollowers {
  people: SocialPerson[];
  total: number;
}

export function toPerson(row: {
  account_id: string;
  avatar_url: string | null;
  display_name: string | null;
  username: string;
}): SocialPerson {
  return {
    avatarUrl: row.avatar_url,
    displayName: row.display_name?.trim() || row.username,
    id: row.account_id,
    username: row.username,
  };
}

export interface FollowUser {
  avatarUrl: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  username: string | null;
  viewerStatus?: string | null;
}

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

export type SocialPageLoader = (
  cursor?: FollowCursor | null,
) => Promise<FollowPage>;
