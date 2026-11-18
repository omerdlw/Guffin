import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { and, eq, sql } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import { getOptionalUser, getViewerSession } from "@/features/auth/server";
import { isAiring } from "@/features/catalog/quality";
import type { Session } from "@/lib/db/client";
import { pick } from "@/lib/db/pick";
import {
  accountEpisodeRatings,
  accountShowProgress,
  accountWatchedEpisodes,
} from "@/lib/db/schema";
import { getSeasonDetails, getShowDetails } from "@/lib/tmdb/server";
import type { Episode, SeasonSummary } from "@/lib/tmdb/shared";
import {
  type ContinueItem,
  episodeKey,
  isAired,
  isShowStatus,
  type ShowTracking,
  splitSeasons,
  toShowProgress,
} from "./show";

type AiredEpisode = {
  e: number;
  r: number | null;
  s: number;
};

const CONTINUE_WATCHING_LIMIT = 12;

const PROGRESS_FIELDS = [
  "status",
  "watched_episodes",
  "aired_episodes",
  "last_season",
  "last_episode",
  "last_watched_at",
] as const;

const SEASON_STILL_LIMIT = 30;

function toAiredEpisodes(
  episodes: readonly Episode[],
  today?: string,
): AiredEpisode[] {
  return episodes
    .filter((episode) => isAired(episode.airDate, today))
    .map((episode) => ({
      s: episode.seasonNumber,
      e: episode.episodeNumber,
      r: episode.runtimeMinutes,
    }));
}

export async function getAiredEpisodes(
  showId: number,
): Promise<AiredEpisode[] | null> {
  const show = await getShowDetails(showId);
  if (!show.success) return null;
  const airing = isAiring(show.data.status);
  const { regular } = splitSeasons(show.data.seasons);
  const seasons = await Promise.all(
    regular.map((season) =>
      getSeasonDetails(showId, season.seasonNumber, airing),
    ),
  );
  return seasons.flatMap((season) =>
    season.success ? toAiredEpisodes(season.data.episodes) : [],
  );
}

export async function getSeasonStills(
  showId: number,
  seasons: readonly SeasonSummary[],
  airing: boolean,
): Promise<Record<number, string | null>> {
  const read = seasons.slice(0, SEASON_STILL_LIMIT);
  const details = await Promise.all(
    read.map((season) => getSeasonDetails(showId, season.seasonNumber, airing)),
  );
  const stills: Record<number, string | null> = {};
  details.forEach((result, index) => {
    const episodes = result.success ? result.data.episodes : [];
    stills[read[index]!.seasonNumber] =
      episodes.find((episode) => episode.stillPath)?.stillPath ?? null;
  });
  return stills;
}

export async function setShowCompleted(
  session: Session,
  userId: string,
  showId: number,
  completed: boolean,
): Promise<void> {
  if (completed) {
    const episodes = await getAiredEpisodes(showId);
    await session.call("set_show_status", {
      p_episodes: episodes ?? [],
      p_show_id: showId,
      p_status: "completed",
    });
    return;
  }

  const [data] = await session.db
    .select({ watchedEpisodes: accountShowProgress.watchedEpisodes })
    .from(accountShowProgress)
    .where(
      and(
        eq(accountShowProgress.accountId, userId),
        eq(accountShowProgress.showId, showId),
      ),
    )
    .limit(1);
  await session.call("set_show_status", {
    p_show_id: showId,
    p_status: data && data.watchedEpisodes > 0 ? "watching" : null,
  });
}

export async function getShowTracking(
  showId: number,
): Promise<ShowTracking | null> {
  try {
    const user = await getOptionalUser();
    if (!user) return null;
    const userId = user.id;
    const { db } = await getViewerSession();

    const [progress, watched, ratings] = await Promise.all([
      db
        .select(pick(accountShowProgress, PROGRESS_FIELDS))
        .from(accountShowProgress)
        .where(
          and(
            eq(accountShowProgress.accountId, userId),
            eq(accountShowProgress.showId, showId),
          ),
        )
        .limit(1),
      db
        .select(
          pick(accountWatchedEpisodes, ["season_number", "episode_number"]),
        )
        .from(accountWatchedEpisodes)
        .where(
          and(
            eq(accountWatchedEpisodes.accountId, userId),
            eq(accountWatchedEpisodes.showId, showId),
          ),
        )
        .limit(5000),
      db
        .select(
          pick(accountEpisodeRatings, [
            "season_number",
            "episode_number",
            "rating",
          ]),
        )
        .from(accountEpisodeRatings)
        .where(
          and(
            eq(accountEpisodeRatings.accountId, userId),
            eq(accountEpisodeRatings.showId, showId),
          ),
        )
        .limit(5000),
    ]);

    return {
      progress: toShowProgress(progress[0] ?? null),
      watched: watched.map((row) =>
        episodeKey(row.season_number, row.episode_number),
      ),
      ratings: ratings.map((row) => ({
        season: row.season_number,
        episode: row.episode_number,
        rating: Number(row.rating),
      })),
    };
  } catch (error) {
    report("Show tracking read", error);
    return null;
  }
}

export async function getContinueWatching(
  limit = CONTINUE_WATCHING_LIMIT,
): Promise<ContinueItem[]> {
  try {
    const user = await getOptionalUser();
    if (!user) return [];
    const { db } = await getViewerSession();

    const data = await db
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
          eq(accountShowProgress.accountId, user.id),
          eq(accountShowProgress.status, "watching"),
        ),
      )
      .orderBy(sql`${accountShowProgress.lastWatchedAt} desc nulls last`)
      .limit(limit);
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
  } catch (error) {
    unstable_rethrow(error);
    report("Continue watching read", error);
    return [];
  }
}
