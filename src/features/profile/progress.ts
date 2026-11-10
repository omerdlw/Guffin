import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import type { MediaType } from "@/features/catalog/types";
import type { ContinueItem, ShowStatus } from "@/features/tv/types";
import { isShowStatus } from "@/features/tv/utils";
import { DIARY_MONTH_LIMIT, WATCHING_SHELF_LIMIT } from "./constants";
import type { DiaryEntryRow, DiaryMonth, ProfileClient } from "./types";
import { monthBounds, releaseYear } from "./utils";

export function getWatchingShows(options: {
  accountId: string;
  client: ProfileClient;
}): Promise<ContinueItem[]> {
  return getTrackedShows({
    ...options,
    limit: WATCHING_SHELF_LIMIT,
    statuses: ["watching"],
  });
}

/** An account's tracked shows in the given statuses, last watched first. */
export async function getTrackedShows({
  accountId,
  client,
  limit,
  statuses,
}: {
  accountId: string;
  client: ProfileClient;
  limit: number;
  statuses: readonly ShowStatus[];
}): Promise<ContinueItem[]> {
  const { data, error } = await client
    .from("account_show_progress")
    .select(
      "show_id, status, title, poster_path, backdrop_path, watched_episodes, aired_episodes, last_season, last_episode",
    )
    .eq("account_id", accountId)
    .in("status", [...statuses])
    .order("last_watched_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    report("Tracked shows read", error);
    return [];
  }
  return data.flatMap((row) =>
    isShowStatus(row.status)
      ? [
          {
            showId: row.show_id,
            status: row.status,
            title: row.title,
            posterPath: row.poster_path,
            backdropPath: row.backdrop_path,
            watchedEpisodes: row.watched_episodes,
            airedEpisodes: row.aired_episodes,
            lastSeason: row.last_season,
            lastEpisode: row.last_episode,
          },
        ]
      : [],
  );
}

export async function getDiaryMonth({
  accountId,
  client,
  mediaType = "movie",
  month,
}: {
  accountId: string;
  client: ProfileClient;
  mediaType?: MediaType;
  month: string | null;
}): Promise<DiaryMonth> {
  const edge = (ascending: boolean) =>
    client
      .from("account_diary")
      .select("watched_on")
      .eq("account_id", accountId)
      .eq("media_type", mediaType)
      .order("watched_on", { ascending })
      .limit(1)
      .maybeSingle();

  const [first, last] = await Promise.all([edge(true), edge(false)]);
  const firstMonth = first.data?.watched_on.slice(0, 7) ?? null;
  const lastMonth = last.data?.watched_on.slice(0, 7) ?? null;
  const target = month ?? lastMonth ?? new Date().toISOString().slice(0, 7);

  const { from, to } = monthBounds(target);
  const { data, error } = await client
    .from("account_diary")
    .select(
      "id, tmdb_id, title, poster_path, release_date, watched_on, is_rewatch",
    )
    .eq("account_id", accountId)
    .eq("media_type", mediaType)
    .gte("watched_on", from)
    .lt("watched_on", to)
    .order("watched_on", { ascending: false })
    .order("watched_at", { ascending: false })
    .limit(DIARY_MONTH_LIMIT);
  if (error) throw error;

  const entries = (data ?? []) as DiaryEntryRow[];
  const reviews =
    entries.length > 0
      ? await client
          .from("reviews")
          .select("tmdb_id, rating, content")
          .eq("account_id", accountId)
          .eq("media_type", mediaType)
          .in("tmdb_id", [...new Set(entries.map((entry) => entry.tmdb_id))])
      : null;
  const byMovie = new Map(
    (reviews?.data ?? []).flatMap((review) =>
      review.tmdb_id === null ? [] : [[review.tmdb_id, review] as const],
    ),
  );

  return {
    first: firstMonth,
    last: lastMonth,
    month: target,
    rows: entries.map((entry) => {
      const review = byMovie.get(entry.tmdb_id);
      return {
        hasReview: Boolean(review?.content.trim()),
        id: entry.id,
        isRewatch: entry.is_rewatch,
        posterPath: entry.poster_path,
        rating:
          review?.rating === null || review?.rating === undefined
            ? null
            : Number(review.rating),
        title: entry.title,
        tmdbId: entry.tmdb_id,
        watchedOn: entry.watched_on,
        year: releaseYear(entry.release_date),
      };
    }),
  };
}
