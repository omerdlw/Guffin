import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { getOptionalUser } from "@/features/auth/server";
import { isAiring } from "@/features/catalog/quality";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

type TvClient = SupabaseClient<Database>;

type AiredEpisode = {
  e: number;
  r: number | null;
  s: number;
};

const CONTINUE_WATCHING_LIMIT = 12;

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
