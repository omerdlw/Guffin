import "server-only";
import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { getOptionalUser } from "@/features/auth/server";
import { getContinueWatching } from "@/features/tv/server";
import { TV_ENABLED } from "@/lib/env";
import { getRedisClient } from "@/lib/security";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import {
  getMovieDetails,
  getMovieList,
  getShowList,
  getTrendingMovies,
  getTrendingShows,
} from "@/lib/tmdb/server";
import type { FeaturedMovie } from "@/lib/tmdb/shared";
import {
  EMPTY_PULSE,
  FEATURE_LIMIT,
  LOGGED_LIMIT,
  LOGGED_SCAN,
  PICKS_MIN_FILMS,
  PICKS_RANK_CONSTANT,
  PULSE_COLD_TIMEOUT_MS,
  PULSE_FRESH_MS,
  PULSE_KEEP_SECONDS,
  PULSE_KEY,
  PULSE_LOCK_KEY,
  PULSE_LOCK_SECONDS,
  ROW_LIMIT,
  SEED_LIMIT,
  THEATRES_MIN_VOTES,
} from "./constants";
import type {
  CachedPulse,
  Circle,
  CircleRow,
  Feature,
  HomeFeed,
  HomeShows,
  Picks,
  PulseRow,
  RecentLog,
  ShowingFilm,
} from "./types";
import {
  fromTmdb,
  fuseRankings,
  mergeFeatureCandidates,
  pickShowing,
  resultsOf,
  selectMembers,
  toFeature,
  toFilm,
  toIsoDate,
  toMember,
  toPulseShelves,
  toShowShelf,
  uniqueMovies,
} from "./utils";

async function readPulse(signal?: AbortSignal): Promise<PulseRow> {
  const query = createAdminSupabaseClient().rpc("get_home_pulse");
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return (data as unknown as PulseRow | null) ?? EMPTY_PULSE;
}

async function recount(signal?: AbortSignal): Promise<PulseRow> {
  const pulse = await readPulse(signal);
  const redis = getRedisClient();
  if (redis) {
    const entry: CachedPulse = { at: Date.now(), pulse };
    await redis
      .set(PULSE_KEY, entry, { ex: PULSE_KEEP_SECONDS })
      .catch((error: unknown) => {
        unstable_rethrow(error);
        report("Home pulse cache write", error);
      });
  }
  return pulse;
}

async function refreshPulse(): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    const acquired = await redis
      .set(PULSE_LOCK_KEY, 1, { ex: PULSE_LOCK_SECONDS, nx: true })
      .catch(() => "OK");
    if (!acquired) return;
  }
  await recount();
}

function refreshPulseLater(): void {
  after(() =>
    refreshPulse().catch((error: unknown) =>
      report("Home pulse refresh", error),
    ),
  );
}

async function getPulse(): Promise<PulseRow> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get<CachedPulse>(PULSE_KEY);
      if (cached) {
        if (Date.now() - cached.at > PULSE_FRESH_MS) refreshPulseLater();
        return cached.pulse;
      }
    } catch (error) {
      unstable_rethrow(error);
      report("Home pulse cache read", error);
    }
  }

  try {
    return await recount(AbortSignal.timeout(PULSE_COLD_TIMEOUT_MS));
  } catch (error) {
    unstable_rethrow(error);
    report("Home pulse read", error);
    refreshPulseLater();
    return EMPTY_PULSE;
  }
}

async function getCircle(): Promise<CircleRow | null> {
  try {
    if (!(await getOptionalUser())) return null;
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("get_home_circle");
    if (error) throw error;
    return (data as unknown as CircleRow | null) ?? null;
  } catch (error) {
    unstable_rethrow(error);
    report("Home circle read", error);
    return null;
  }
}

async function getRecentLogs(): Promise<RecentLog[]> {
  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("account_diary")
      .select(
        "id, tmdb_id, title, poster_path, backdrop_path, release_date, watched_at, is_rewatch, author:accounts!inner(username, display_name, avatar_url)",
      )
      .eq("media_type", "movie")
      .eq("author.is_active", true)
      .eq("author.is_private", false)
      .not("author.username", "is", null)
      .not("poster_path", "is", null)
      .order("watched_at", { ascending: false })
      .limit(LOGGED_SCAN);
    if (error) throw error;
    const seen = new Set<number>();
    const logs: RecentLog[] = [];
    for (const row of data ?? []) {
      if (seen.has(row.tmdb_id) || !row.author.username) continue;
      seen.add(row.tmdb_id);
      logs.push({
        author: toMember({ ...row.author, username: row.author.username }),
        film: toFilm(row),
        id: row.id,
        rewatch: row.is_rewatch,
        watchedAt: row.watched_at,
      });
      if (logs.length === LOGGED_LIMIT) break;
    }
    return logs;
  } catch (error) {
    unstable_rethrow(error);
    report("Home recent logs read", error);
    return [];
  }
}

async function getWaiting(ids: number[]): Promise<Map<number, number>> {
  const waiting = new Map<number, number>();
  if (ids.length === 0) return waiting;
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("film_stats")
      .select("tmdb_id, watchlist_count, watched_count")
      .in("tmdb_id", ids);
    if (error) throw error;
    for (const row of data ?? []) waiting.set(row.tmdb_id, row.watchlist_count);
  } catch (error) {
    unstable_rethrow(error);
    report("Home film stats read", error);
  }
  return waiting;
}

async function getFeatures(
  trending: FeaturedMovie[],
  pulse: PulseRow,
): Promise<Feature[]> {
  const candidates = mergeFeatureCandidates(trending, pulse.popular);
  const details = await Promise.all(
    candidates.map((candidate) => getMovieDetails(candidate.id)),
  );
  return candidates
    .flatMap((candidate, index) => {
      const outcome = details[index]!;
      const feature = outcome.success
        ? toFeature(candidate, outcome.data)
        : null;
      return feature ? [feature] : [];
    })
    .slice(0, FEATURE_LIMIT);
}

async function getPicks(circle: CircleRow): Promise<Picks | null> {
  const seeds = circle.seeds.slice(0, SEED_LIMIT);
  if (seeds.length === 0) return null;
  const details = await Promise.all(
    seeds.map((seed) => getMovieDetails(seed.tmdb_id)),
  );
  const seen = new Set([...circle.seen, ...circle.seeds.map((s) => s.tmdb_id)]);
  const lists = details.map((outcome) =>
    outcome.success
      ? outcome.data.recommendations.filter(
          (movie) => movie.posterPath && !seen.has(movie.id),
        )
      : [],
  );
  const films = fuseRankings(lists, (movie) => movie.id, PICKS_RANK_CONSTANT)
    .slice(0, ROW_LIMIT)
    .map(({ item }) => ({
      backdropPath: item.backdropPath,
      id: item.id,
      posterPath: item.posterPath,
      title: item.title,
      year: item.releaseYear,
    }));
  if (films.length < PICKS_MIN_FILMS) return null;
  const lead = seeds.find((_, i) => lists[i]!.length > 0) ?? seeds[0]!;
  return { because: lead.title, films };
}

async function getCircleFeed(circle: CircleRow | null): Promise<Circle | null> {
  if (!circle) return null;
  return {
    following: circle.following,
    friends: circle.friends.map((row) => ({
      author: toMember(row.author),
      film: toFilm(row),
      id: row.id,
      liked: row.liked,
      rating: row.rating,
      reviewed: row.reviewed,
      rewatch: row.rewatch,
      watchedAt: row.watched_at,
    })),
    name: circle.viewer.display_name || circle.viewer.username || "",
    username: circle.viewer.username,
    picks: await getPicks(circle),
    shared: circle.shared.map((row) => ({
      ...toFilm(row),
      faces: row.faces.map(toMember),
      friends: row.friends,
    })),
  };
}

async function getShows(): Promise<HomeShows | null> {
  if (!TV_ENABLED) return null;
  const [trending, onTheAir, continueWatching] = await Promise.all([
    getTrendingShows("week"),
    getShowList("on_the_air"),
    getContinueWatching(),
  ]);
  return {
    continueWatching,
    onTheAir: toShowShelf(onTheAir, ROW_LIMIT),
    trending: toShowShelf(trending, ROW_LIMIT),
  };
}

export const getHomeFeed = cache(async (): Promise<HomeFeed> => {
  const [
    week,
    playing,
    upcoming,
    upcomingNext,
    pulse,
    circleRow,
    shows,
    logged,
  ] = await Promise.all([
    getTrendingMovies("week"),
    getMovieList("now_playing"),
    getMovieList("upcoming"),
    getMovieList("upcoming", { page: 2 }),
    getPulse(),
    getCircle(),
    getShows(),
    getRecentLogs(),
  ]);

  const { soon, theatres } = pickShowing(
    {
      playing: resultsOf(playing),
      upcoming: [...resultsOf(upcoming), ...resultsOf(upcomingNext)],
    },
    THEATRES_MIN_VOTES,
    toIsoDate(Date.now()),
  );

  const [features, circle, waiting] = await Promise.all([
    getFeatures(uniqueMovies(resultsOf(week)), pulse),
    getCircleFeed(circleRow),
    getWaiting([...theatres, ...soon].map((movie) => movie.id)),
  ]);

  const toShowing = (movie: FeaturedMovie): ShowingFilm => ({
    ...fromTmdb(movie),
    releaseDate: movie.releaseDate,
    waiting: waiting.get(movie.id) ?? 0,
  });

  return {
    ...toPulseShelves(pulse),
    circle,
    feature: features[Math.floor(Math.random() * features.length)] ?? null,
    logged,
    members: selectMembers(pulse, circleRow),
    pulse: pulse.counts,
    shows,
    soon: soon.map(toShowing),
    theatres: theatres.map(toShowing),
  };
});
