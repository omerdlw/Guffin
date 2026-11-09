import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_rethrow } from "next/navigation";
import { getOptionalUser } from "@/features/auth/server";
import { isAiring } from "@/features/catalog/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeasonDetails, getShowDetails } from "@/lib/tmdb/server";
import { CONTINUE_WATCHING_LIMIT, SEASON_STILL_LIMIT } from "./constants";
import type {
  AiredEpisode,
  ContinueItem,
  EpisodeStat,
  SeasonSummary,
  ShowTracking,
  TvClient,
} from "./types";
import {
  episodeKey,
  isShowStatus,
  splitSeasons,
  toAiredEpisodes,
  toShowProgress,
} from "./utils";

/** Every aired regular episode of a show, read season by season from TMDB. */
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

/**
 * One still per season for the seasons shelf: its premiere's frame, else the
 * first episode that has one. Seasons past the limit fall back to the show's
 * backdrop rather than cost a request each.
 */
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

/**
 * Complete a show (ticking every aired episode) or undo that. Undoing keeps
 * the show tracked as "watching" if any episode is ticked, else stops it.
 */
export async function setShowCompleted(
  client: TvClient,
  showId: number,
  completed: boolean,
): Promise<void> {
  if (completed) {
    const episodes = await getAiredEpisodes(showId);
    const { error } = await client.rpc("set_show_status", {
      p_show_id: showId,
      p_status: "completed",
      p_episodes: episodes ?? [],
    });
    if (error) throw error;
    return;
  }

  const { data } = await client
    .from("account_show_progress")
    .select("watched_episodes")
    .eq("show_id", showId)
    .maybeSingle();
  const { error } = await client.rpc("set_show_status", {
    p_show_id: showId,
    p_status: data && data.watched_episodes > 0 ? "watching" : null,
  });
  if (error) throw error;
}

/** The viewer's status, ticks and ratings for one show. */
export async function getShowTracking(
  showId: number,
): Promise<ShowTracking | null> {
  try {
    const client = await createServerSupabaseClient();
    const { data: auth } = await client.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    const [progress, watched, ratings] = await Promise.all([
      client
        .from("account_show_progress")
        .select("*")
        .eq("account_id", userId)
        .eq("show_id", showId)
        .maybeSingle(),
      client
        .from("account_watched_episodes")
        .select("season_number, episode_number")
        .eq("account_id", userId)
        .eq("show_id", showId)
        .limit(5000),
      client
        .from("account_episode_ratings")
        .select("season_number, episode_number, rating")
        .eq("account_id", userId)
        .eq("show_id", showId)
        .limit(5000),
    ]);
    if (progress.error) throw progress.error;
    if (watched.error) throw watched.error;
    if (ratings.error) throw ratings.error;

    return {
      progress: toShowProgress(progress.data),
      watched: watched.data.map((row) =>
        episodeKey(row.season_number, row.episode_number),
      ),
      ratings: ratings.data.map((row) => ({
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

/** Guffin's rating spread per episode, for the season heatmap. */
export async function getEpisodeStats(showId: number): Promise<EpisodeStat[]> {
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("episode_stats")
      .select("season_number, episode_number, ratings_count, rating_average")
      .eq("show_id", showId)
      .gt("ratings_count", 0)
      .limit(5000);
    if (error) throw error;
    return data.map((row) => ({
      season: row.season_number,
      episode: row.episode_number,
      count: row.ratings_count ?? 0,
      average: row.rating_average === null ? null : Number(row.rating_average),
    }));
  } catch (error) {
    report("Episode stats read", error);
    return [];
  }
}

/** Shows the signed-in viewer is in the middle of, most recent first. */
export async function getContinueWatching(
  limit = CONTINUE_WATCHING_LIMIT,
): Promise<ContinueItem[]> {
  try {
    const user = await getOptionalUser();
    if (!user) return [];
    const userId = user.id;
    const client = await createServerSupabaseClient();

    const { data, error } = await client
      .from("account_show_progress")
      .select(
        "show_id, status, title, poster_path, backdrop_path, watched_episodes, aired_episodes, last_season, last_episode",
      )
      .eq("account_id", userId)
      .eq("status", "watching")
      .order("last_watched_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
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
