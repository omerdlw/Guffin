"use server";
import "server-only";

import { revalidatePath } from "next/cache";
import { fail, ok } from "@/features/auth/mutation";
import { mutate } from "@/features/auth/server";
import { ensureCatalogEntry } from "@/features/catalog/server";
import { tvHref } from "@/lib/project";
import { getSeasonDetails } from "@/lib/tmdb/server";
import { isTmdbId } from "@/lib/tmdb/transport";
import { getAiredEpisodes, getShowTracking, setShowCompleted } from "./server";
import {
  isAired,
  isShowStatus,
  type ShowProgress,
  type ShowStatus,
  type ShowTracking,
  toShowProgress,
} from "./show";

type TvActionResult<T extends object = object> =
  ({ success: true } & T) | { error: string; success: false };

const EPISODES_PER_REQUEST_MAX = 500;

const TRACKING_ERRORS: Record<string, string> = {
  CATALOG_MISSING: "Could not load this show, try again",
  INVALID_EPISODES: "Those episodes could not be marked",
  INVALID_STATUS: "Pick a status from the list",
};

function trackingErrorMessage(message: string | undefined): string | null {
  if (!message) return null;
  const code = Object.keys(TRACKING_ERRORS).find((key) =>
    message.includes(key),
  );
  return code ? TRACKING_ERRORS[code] : null;
}

function isSeason(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 500
  );
}

function isEpisodeList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= EPISODES_PER_REQUEST_MAX &&
    value.every((n) => Number.isInteger(n) && n >= 1 && n <= 32767)
  );
}

function rpcFailure(error: { message?: string }, fallback: string) {
  return fail(trackingErrorMessage(error.message) ?? fallback);
}

export async function setEpisodesWatchedAction(
  showId: number,
  season: number,
  episodes: number[],
  watched: boolean,
): Promise<TvActionResult<{ progress: ShowProgress | null }>> {
  if (!isTmdbId(showId) || !isSeason(season) || !isEpisodeList(episodes)) {
    return fail("Invalid request");
  }

  return mutate(
    {
      fallback: "Could not update your progress",
      name: "Episodes write",
      scope: "tv-progress",
      perMinute: 240,
    },
    async ({ client }) => {
      if (!(await ensureCatalogEntry("tv", showId))) {
        return fail("Could not load this show, try again");
      }

      const seasonData = await getSeasonDetails(showId, season);
      const byNumber = new Map(
        seasonData.success
          ? seasonData.data.episodes.map((e) => [e.episodeNumber, e])
          : [],
      );
      const aired = season > 0 ? await getAiredEpisodes(showId) : null;

      const { data, error } = await client.rpc("set_episodes_watched", {
        p_show_id: showId,
        p_season: season,
        p_episodes: episodes,
        p_watched: watched,
        p_aired_count: aired ? aired.filter((e) => e.s > 0).length : null,
        p_runtimes: episodes.map((n) => byNumber.get(n)?.runtimeMinutes ?? 0),
      });
      if (error) return rpcFailure(error, "Could not update your progress");

      revalidatePath(tvHref(showId));
      return ok({ progress: toShowProgress(data) });
    },
  );
}

export async function setSeasonWatchedAction(
  showId: number,
  season: number,
  watched: boolean,
): Promise<TvActionResult<{ progress: ShowProgress | null }>> {
  if (!isTmdbId(showId) || !isSeason(season)) return fail("Invalid request");
  const details = await getSeasonDetails(showId, season);
  if (!details.success) return fail("Could not load this season, try again");
  const episodes = details.data.episodes
    .filter((episode) => !watched || isAired(episode.airDate))
    .map((episode) => episode.episodeNumber);
  if (episodes.length === 0) return fail("No episode of this season has aired");
  return setEpisodesWatchedAction(showId, season, episodes, watched);
}

export async function setShowStatusAction(
  showId: number,
  status: ShowStatus | null,
): Promise<TvActionResult<{ progress: ShowProgress | null }>> {
  if (!isTmdbId(showId) || (status !== null && !isShowStatus(status))) {
    return fail("Invalid request");
  }

  return mutate(
    {
      fallback: "Could not update this show",
      name: "Show status write",
      scope: "tv-progress",
      perMinute: 60,
    },
    async ({ client }) => {
      if (status !== null && !(await ensureCatalogEntry("tv", showId))) {
        return fail("Could not load this show, try again");
      }

      if (status === "completed") {
        await setShowCompleted(client, showId, true);
      } else {
        const { error } = await client.rpc("set_show_status", {
          p_show_id: showId,
          p_status: status,
        });
        if (error) return rpcFailure(error, "Could not update this show");
      }

      const { data } = await client
        .from("account_show_progress")
        .select("*")
        .eq("show_id", showId)
        .maybeSingle();

      revalidatePath(tvHref(showId));
      return ok({ progress: toShowProgress(data) });
    },
  );
}

export async function rateEpisodeAction(
  showId: number,
  season: number,
  episode: number,
  rating: number | null,
): Promise<TvActionResult> {
  const validRating =
    rating === null ||
    (rating >= 0.5 && rating <= 5 && Number.isInteger(rating * 2));
  if (
    !isTmdbId(showId) ||
    !isSeason(season) ||
    !Number.isInteger(episode) ||
    episode < 1 ||
    !validRating
  ) {
    return fail("Invalid request");
  }

  return mutate(
    {
      fallback: "Could not save your rating",
      name: "Episode rating write",
      scope: "tv-progress",
      perMinute: 240,
    },
    async ({ client }) => {
      if (!(await ensureCatalogEntry("tv", showId))) {
        return fail("Could not load this show, try again");
      }
      const details = await getSeasonDetails(showId, season);
      const runtime = details.success
        ? (details.data.episodes.find((e) => e.episodeNumber === episode)
            ?.runtimeMinutes ?? null)
        : null;

      const { error } = await client.rpc("set_episode_rating", {
        p_show_id: showId,
        p_season: season,
        p_episode: episode,
        p_rating: rating,
        p_runtime: runtime,
      });
      if (error) return rpcFailure(error, "Could not save your rating");

      revalidatePath(tvHref(showId));
      return ok();
    },
  );
}

export async function getShowTrackingAction(
  showId: number,
): Promise<TvActionResult<{ tracking: ShowTracking | null }>> {
  if (!isTmdbId(showId)) return fail("Invalid request");
  return ok({ tracking: await getShowTracking(showId) });
}
