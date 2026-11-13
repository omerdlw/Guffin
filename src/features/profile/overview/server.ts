import "server-only";

import {
  type AccountOverviewData,
  type ActivityRow,
  type LibraryCounts,
  type ListRow,
  type MovieRow,
  type ProfileClient,
  type ReviewRow,
  toActivityItem,
  toListCard,
  toMediaItem,
  toReviewCard,
} from "@/features/profile/profile";
import type { MediaType } from "@/lib/tmdb/shared";

interface OverviewRow {
  activity: ActivityRow[];
  activity_days: { counts: number[] | null; from: string } | null;
  diary: { id: string; title: string; tmdb_id: number; watched_on: string }[];
  favorites: MovieRow[];
  following: {
    avatar_url: string | null;
    display_name: string | null;
    username: string;
  }[];
  lists: (ListRow & { previews: (string | null)[] })[];
  popular_reviews: (ReviewRow & { liked: boolean })[];
  rating_spread: number[] | null;
  recent_reviews: (ReviewRow & { liked: boolean })[];
  stats: {
    diary_count: number;
    following_count: number;
    likes_count: number;
    lists_count: number;
    reviews_count: number;
    watched_count: number;
    watchlist_count: number;
  } | null;
  watched: MovieRow[];
  watchlist: MovieRow[];
}

const EMPTY_LIBRARY_COUNTS: LibraryCounts = Object.freeze({
  diary: 0,
  likes: 0,
  lists: 0,
  reviews: 0,
  watched: 0,
  watchlist: 0,
});

const EMPTY_OVERVIEW: OverviewRow = {
  activity: [],
  activity_days: null,
  diary: [],
  favorites: [],
  following: [],
  lists: [],
  popular_reviews: [],
  rating_spread: null,
  recent_reviews: [],
  stats: null,
  watched: [],
  watchlist: [],
};

const reviewCards = (rows: (ReviewRow & { liked: boolean })[]) => {
  const liked = new Set(rows.filter((row) => row.liked).map((row) => row.id));
  return rows.flatMap((row) => toReviewCard(row, liked));
};

export async function getAccountOverview({
  accountId,
  accountUsername,
  client,
  limits,
  mediaType = "movie",
}: {
  accountId: string;
  accountUsername: string;
  client: ProfileClient;
  mediaType?: MediaType;
  limits: {
    activity: number;
    diary: number;
    following: number;
    lists: number;
    popular: number;
    reviews: number;
    watched: number;
    watchlist: number;
  };
}): Promise<AccountOverviewData> {
  const { data, error } = await client.rpc("get_account_overview", {
    p_account_id: accountId,
    p_activity: limits.activity,
    p_diary: limits.diary,
    p_following: limits.following,
    p_media_type: mediaType,
    p_lists: limits.lists,
    p_popular: limits.popular,
    p_reviews: limits.reviews,
    p_watched: limits.watched,
    p_watchlist: limits.watchlist,
  });
  if (error) throw error;

  const row = (data as unknown as OverviewRow | null) ?? EMPTY_OVERVIEW;
  const stats = row.stats;
  const none = new Set<number>();

  return {
    activity: row.activity.map((item) => toActivityItem(item, accountUsername)),
    activityDays: {
      counts: (row.activity_days?.counts ?? []).map(Number),
      from: row.activity_days?.from ?? "",
    },
    counts: stats
      ? {
          diary: stats.diary_count,
          likes: stats.likes_count,
          lists: stats.lists_count,
          reviews: stats.reviews_count,
          watched: stats.watched_count,
          watchlist: stats.watchlist_count,
        }
      : EMPTY_LIBRARY_COUNTS,
    diary: row.diary.map((entry) => ({
      id: entry.id,
      title: entry.title,
      tmdbId: entry.tmdb_id,
      watchedOn: entry.watched_on,
    })),
    favorites: row.favorites.map((film) => toMediaItem(film, none, mediaType)),
    following: row.following.map((person) => ({
      avatarUrl: person.avatar_url,
      displayName: person.display_name || person.username,
      username: person.username,
    })),
    followingCount: stats?.following_count ?? 0,
    lists: row.lists.map((list) => toListCard(list, list.previews)),
    popular: reviewCards(row.popular_reviews),
    reviews: reviewCards(row.recent_reviews),
    spread: Array.from(
      { length: 10 },
      (_, index) => Number(row.rating_spread?.[index]) || 0,
    ),
    watched: row.watched.map((film) => toMediaItem(film, none, mediaType)),
    watchlist: row.watchlist.map((film) => toMediaItem(film, none, mediaType)),
  };
}
