import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { and, eq, inArray, sql } from "drizzle-orm";
import { pick } from "@/lib/db/pick";
import { accountShowProgress } from "@/lib/db/schema";
import type { ProfileClient } from "@/features/profile/profile";
import {
  type ContinueItem,
  isShowStatus,
  type ShowStatus,
} from "@/features/tv/show";

const WATCHING_SHELF_LIMIT = 12;

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
  let data;
  try {
    data = await client.db
      .select(
        pick(accountShowProgress, [
          "show_id",
          "status",
          "title",
          "poster_path",
          "backdrop_path",
          "watched_episodes",
          "aired_episodes",
          "last_season",
          "last_episode",
        ]),
      )
      .from(accountShowProgress)
      .where(
        and(
          eq(accountShowProgress.accountId, accountId),
          inArray(accountShowProgress.status, [...statuses]),
        ),
      )
      .orderBy(sql`${accountShowProgress.lastWatchedAt} desc nulls last`)
      .limit(limit);
  } catch (error) {
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
