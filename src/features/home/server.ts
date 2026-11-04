import "server-only";
import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { getOptionalUser } from "@/features/auth/server";
import { getRedisClient } from "@/lib/security";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import {
  getMovieDetails,
  getMovieList,
  getTrendingMovies,
} from "@/lib/tmdb/server";
import type { FeaturedMovie } from "@/lib/tmdb/shared";
import {
  EMPTY_PULSE,
  FEATURE_LIMIT,
  PULSE_FRESH_MS,
  PULSE_KEEP_SECONDS,
  PULSE_KEY,
  RISING_LIMIT,
  ROW_LIMIT,
  SEED_LIMIT,
  SHOWING_LIMIT,
  THEATRES_MIN_VOTES,
} from "./constants";
import type {
  CachedPulse,
  Circle,
  CircleRow,
  Feature,
  HomeFeed,
  Picks,
  PulseRow,
  ShowingFilm,
} from "./types";
import {
  distinct,
  fresh,
  fromTmdb,
  fuse,
  isoDate,
  loglineOf,
  membersOf,
  results,
  toFilm,
  toMember,
} from "./utils";

async function readPulse(): Promise<PulseRow> {
  const { data, error } =
    await createAdminSupabaseClient().rpc("get_home_pulse");
  if (error) throw error;
  return (data as unknown as PulseRow | null) ?? EMPTY_PULSE;
}

async function recount(): Promise<PulseRow> {
  const pulse = await readPulse();
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

async function getPulse(): Promise<PulseRow> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get<CachedPulse>(PULSE_KEY);
      if (cached) {
        if (Date.now() - cached.at > PULSE_FRESH_MS) {
          after(() =>
            recount().catch((error: unknown) =>
              report("Home pulse refresh", error),
            ),
          );
        }
        return cached.pulse;
      }
    } catch (error) {
      unstable_rethrow(error);
      report("Home pulse cache read", error);
    }
  }

  try {
    return await recount();
  } catch (error) {
    unstable_rethrow(error);
    report("Home pulse read", error);
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
  type Candidate = {
    backdropPath: string | null;
    id: number;
    social: PulseRow["popular"][number] | null;
    trending: number | null;
  };
  const world: Candidate[] = trending.map((movie, rank) => ({
    backdropPath: movie.backdropPath,
    id: movie.id,
    social: null,
    trending: rank + 1,
  }));
  const members: Candidate[] = pulse.popular.map((film) => ({
    backdropPath: film.backdrop_path ?? null,
    id: film.tmdb_id,
    social: film,
    trending: null,
  }));
  const ranked = fuse([world, members], (film) => film.id)
    .map(({ item }) => ({
      ...item,
      social:
        item.social ?? members.find((m) => m.id === item.id)?.social ?? null,
      trending:
        item.trending ?? world.find((w) => w.id === item.id)?.trending ?? null,
    }))
    .filter((film) => film.backdropPath)
    .slice(0, FEATURE_LIMIT + 2);

  const details = await Promise.all(
    ranked.map((film) => getMovieDetails(film.id)),
  );
  return ranked
    .flatMap<Feature>((film, i) => {
      const outcome = details[i]!;
      if (!outcome.success) return [];
      const movie = outcome.data;
      const backdropPath = movie.backdropPath ?? film.backdropPath;
      if (!backdropPath) return [];
      return [
        {
          backdropPath,
          genres: movie.genres.slice(0, 3).map((genre) => genre.name),
          id: movie.id,
          logline: loglineOf(movie.overview),
          posterPath: movie.posterPath,
          runtime: movie.runtimeMinutes,
          social: film.social
            ? {
                faces: film.social.faces.map(toMember),
                rating: film.social.rating,
                watchers: film.social.members,
              }
            : null,
          title: movie.title,
          trending: film.trending,
          year: movie.releaseYear,
        },
      ];
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
  const films = fuse(lists, (movie) => movie.id, 10)
    .slice(0, ROW_LIMIT)
    .map(({ item }) => ({
      backdropPath: item.backdropPath,
      id: item.id,
      posterPath: item.posterPath,
      title: item.title,
      year: item.releaseYear,
    }));
  if (films.length < 4) return null;
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
    picks: await getPicks(circle),
    shared: circle.shared.map((row) => ({
      ...toFilm(row),
      faces: row.faces.map(toMember),
      friends: row.friends,
    })),
  };
}

export const getHomeFeed = cache(async (): Promise<HomeFeed> => {
  const [week, playing, upcoming, upcomingNext, pulse, circleRow] =
    await Promise.all([
      getTrendingMovies("week"),
      getMovieList("now_playing"),
      getMovieList("upcoming"),
      getMovieList("upcoming", { page: 2 }),
      getPulse(),
      getCircle(),
    ]);

  const today = isoDate(Date.now());
  const byPopularity = (a: FeaturedMovie, b: FeaturedMovie) =>
    b.popularity - a.popularity;
  const theatres = distinct(results(playing))
    .filter(
      (movie) =>
        movie.posterPath &&
        movie.voteCount >= THEATRES_MIN_VOTES &&
        (movie.releaseDate ?? "") <= today,
    )
    .sort(byPopularity)
    .slice(0, SHOWING_LIMIT);
  const soon = distinct([...results(upcoming), ...results(upcomingNext)])
    .filter((movie) => movie.posterPath && (movie.releaseDate ?? "") > today)
    .sort(byPopularity)
    .slice(0, SHOWING_LIMIT)
    .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));

  const [features, circle, waiting] = await Promise.all([
    getFeatures(distinct(results(week)), pulse),
    getCircleFeed(circleRow),
    getWaiting([...theatres, ...soon].map((movie) => movie.id)),
  ]);

  const toShowing = (movie: FeaturedMovie): ShowingFilm => ({
    ...fromTmdb(movie),
    releaseDate: movie.releaseDate,
    waiting: waiting.get(movie.id) ?? 0,
  });

  const shown = new Set<number>();
  const popular = fresh(
    pulse.popular
      .filter((row) => row.poster_path)
      .map((row) => ({
        ...toFilm(row),
        faces: row.faces.map(toMember),
        members: row.members,
        rating: row.rating,
        watchers: row.watchers,
      })),
    shown,
    ROW_LIMIT,
  );
  const rising = fresh(
    pulse.rising.map((row) => ({
      ...toFilm(row),
      lift: row.lift,
      week: row.week,
    })),
    shown,
    RISING_LIMIT,
  );

  return {
    circle,
    features,
    lists: pulse.lists.map((row) => ({
      description: row.description,
      films: row.items_count,
      id: row.id,
      likes: row.likes_count,
      owner: toMember(row.owner),
      previews: row.previews,
      slug: row.slug,
      title: row.title,
    })),
    members: membersOf(pulse, circleRow),
    popular,
    pulse: pulse.counts,
    rated: pulse.top_rated
      .filter((row) => row.poster_path)
      .slice(0, ROW_LIMIT)
      .map((row) => ({
        ...toFilm(row),
        rating: row.rating,
        ratings: row.ratings,
      })),
    reviews: pulse.reviews.slice(0, 6).map((row) => ({
      author: toMember(row.author),
      content: row.content,
      createdAt: row.created_at,
      film: toFilm(row),
      id: row.id,
      likes: row.likes_count,
      rating: row.rating,
    })),
    rising,
    soon: soon.map(toShowing),
    theatres: theatres.map(toShowing),
  };
});
