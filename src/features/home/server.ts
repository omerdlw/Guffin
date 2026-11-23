import "server-only";

import { cache } from "react";
import type { Result } from "@omerdlw/base-framework/result";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getOptionalUser, getViewerSession } from "@/features/auth/server";
import { toLogline } from "@/shared/format";
import { getRedisClient } from "@/infrastructure/security";
import { admin } from "@/infrastructure/db/client";
import { accountDiary, accounts, filmStats } from "@/infrastructure/db/schema";
import {
  getMovieDetails,
  getMovieList,
  getTrendingMovies,
} from "@/infrastructure/tmdb/server";
import type {
  FeaturedMovie,
  FeaturedMoviePage,
  MovieDetails,
} from "@/infrastructure/tmdb/shared";
import { pickLogo } from "@/infrastructure/tmdb/shared";
import type { TmdbError } from "@/infrastructure/tmdb/transport";
import {
  type Circle,
  type Feature,
  type HomeFeed,
  type HomeFilm,
  type HomeMember,
  type Member,
  type Picks,
  FEATURE_LIMIT,
  MEMBER_LIMIT,
  POPULAR_LIMIT,
  type RecentLog,
  type ShowingFilm,
} from "./feed";

interface FeatureCandidate {
  backdropPath: string | null;
  id: number;
  social: PulseRow["popular"][number] | null;
  trending: number | null;
}

type PulseShelves = Pick<
  HomeFeed,
  "lists" | "popular" | "rated" | "reviews" | "rising"
>;

interface MemberRow {
  avatar_url: string | null;
  display_name: string | null;
  username: string;
}

interface FilmRow {
  backdrop_path?: string | null;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
}

interface PulseRow {
  counts: {
    films: number;
    lists: number;
    logs: number;
    members: number;
    reviews: number;
  };
  lists: {
    description: string;
    id: string;
    items_count: number;
    likes_count: number;
    owner: MemberRow;
    previews: (string | null)[];
    slug: string;
    title: string;
  }[];
  popular: (FilmRow & {
    faces: MemberRow[];
    members: number;
    rating: number | null;
    watchers: number;
  })[];
  reviewers: (MemberRow & {
    bio: string | null;
    followers: number;
    id: string;
    likes: number;
    reviews: number;
    watched: number;
  })[];
  reviews: (FilmRow & {
    author: MemberRow;
    content: string;
    created_at: string;
    id: string;
    likes_count: number;
    rating: number | null;
  })[];
  rising: (FilmRow & { lift: number; week: number })[];
  top_rated: (FilmRow & { rating: number; ratings: number; watched: number })[];
}

interface CircleRow {
  followed: string[];
  following: number;
  friends: (FilmRow & {
    author: MemberRow;
    id: string;
    liked: boolean;
    rating: number | null;
    reviewed: boolean;
    rewatch: boolean;
    watched_at: string;
  })[];
  seeds: { title: string; tmdb_id: number }[];
  seen: number[];
  shared: (FilmRow & { faces: MemberRow[]; friends: number })[];
  suggested: (MemberRow & {
    bio: string | null;
    followers: number;
    id: string;
    mutual: number;
    reviews: number;
    watched: number;
  })[];
  viewer: { display_name: string | null; username: string | null };
}

interface CachedPulse {
  at: number;
  pulse: PulseRow;
}

const LOGLINE_LENGTH = 180;

const LOGLINE_ENOUGH_LENGTH = 80;

const EMPTY_PULSE: PulseRow = {
  counts: { films: 0, lists: 0, logs: 0, members: 0, reviews: 0 },
  lists: [],
  popular: [],
  reviewers: [],
  reviews: [],
  rising: [],
  top_rated: [],
};

const PULSE_KEY = "home:pulse";

const PULSE_FRESH_MS = 5 * 60_000;

const PULSE_KEEP_SECONDS = 7 * 24 * 60 * 60;

const PULSE_LOCK_KEY = "home:pulse:lock";

const PULSE_LOCK_SECONDS = 60;

const PULSE_COLD_TIMEOUT_MS = 4000;

const LOGGED_LIMIT = 18;

const LOGGED_SCAN = 120;

const FEATURE_SPARE_CANDIDATES = 2;

const FEATURE_GENRE_LIMIT = 3;

const REVIEW_LIMIT = 6;

const PICKS_MIN_FILMS = 4;

const PICKS_RANK_CONSTANT = 10;

const ROW_LIMIT = 16;

const SHOWING_LIMIT = 12;

const RISING_LIMIT = 8;

const SEED_LIMIT = 3;

const THEATRES_MIN_VOTES = 25;

function fuseRankings<T>(
  lists: readonly (readonly T[])[],
  key: (item: T) => number,
  k = 60,
): { item: T; score: number }[] {
  const scores = new Map<number, { item: T; score: number }>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const id = key(item);
      const entry = scores.get(id) ?? { item, score: 0 };
      entry.score += 1 / (k + rank + 1);
      scores.set(id, entry);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}

const rotate = <T>(items: readonly T[], by: number): T[] => [
  ...items.slice(by),
  ...items.slice(0, by),
];

function takeUnseen<T extends { id: number }>(
  items: readonly T[],
  shown: Set<number>,
  limit: number,
): T[] {
  const kept = items.filter((item) => !shown.has(item.id)).slice(0, limit);
  kept.forEach((item) => shown.add(item.id));
  return kept;
}

const yearOf = (date: string | null | undefined): number | null => {
  const year = Number(date?.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
};

const featureLogline = (overview: string | null | undefined) =>
  toLogline(overview, LOGLINE_LENGTH, LOGLINE_ENOUGH_LENGTH);

const resultsOf = (
  outcome: Result<FeaturedMoviePage, TmdbError>,
): FeaturedMovie[] => (outcome.success ? outcome.data.results : []);

const toMember = (row: MemberRow): Member => ({
  avatarUrl: row.avatar_url,
  displayName: row.display_name || row.username,
  username: row.username,
});

const toFilm = (row: FilmRow): HomeFilm => ({
  backdropPath: row.backdrop_path ?? null,
  id: row.tmdb_id,
  posterPath: row.poster_path,
  title: row.title,
  year: yearOf(row.release_date),
});

const fromTmdb = (movie: FeaturedMovie): HomeFilm => ({
  backdropPath: movie.backdropPath,
  id: movie.id,
  posterPath: movie.posterPath,
  title: movie.title,
  year: movie.releaseYear,
});

const toIsoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

function uniqueMovies(movies: readonly FeaturedMovie[]): FeaturedMovie[] {
  const seen = new Set<number>();
  return movies.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

function selectMembers(
  pulse: PulseRow,
  circle: CircleRow | null,
): HomeMember[] {
  const self = circle?.viewer.username ?? null;
  const suggested: HomeMember[] = (circle?.suggested ?? []).map((row) => ({
    ...toMember(row),
    bio: row.bio,
    followers: row.followers,
    id: row.id,
    reason: `Followed by ${row.mutual} you follow`,
    reviews: row.reviews,
    watched: row.watched,
  }));
  const followed = new Set(circle?.followed ?? []);
  const reviewers: HomeMember[] = pulse.reviewers
    .filter((row) => row.username !== self && !followed.has(row.id))
    .map((row) => ({
      ...toMember(row),
      bio: row.bio,
      followers: row.followers,
      id: row.id,
      reason: `${row.likes.toLocaleString("en-US")} likes on reviews this month`,
      reviews: row.reviews,
      watched: row.watched,
    }));
  const taken = new Set(suggested.map((member) => member.id));
  return [
    ...suggested,
    ...reviewers.filter((member) => !taken.has(member.id)),
  ].slice(0, MEMBER_LIMIT);
}

function pickShowing(
  {
    playing,
    upcoming,
  }: { playing: FeaturedMovie[]; upcoming: FeaturedMovie[] },
  minVotes: number,
  today: string,
): { soon: FeaturedMovie[]; theatres: FeaturedMovie[] } {
  const byPopularity = (a: FeaturedMovie, b: FeaturedMovie) =>
    b.popularity - a.popularity;
  const releasedBy = (movie: FeaturedMovie) => movie.releaseDate ?? "";

  const theatres = uniqueMovies(playing)
    .filter(
      (movie) =>
        movie.posterPath &&
        movie.voteCount >= minVotes &&
        releasedBy(movie) <= today,
    )
    .sort(byPopularity)
    .slice(0, SHOWING_LIMIT)
    .sort((a, b) => releasedBy(b).localeCompare(releasedBy(a)));
  const soon = uniqueMovies(upcoming)
    .filter((movie) => movie.posterPath && releasedBy(movie) > today)
    .sort(byPopularity)
    .slice(0, SHOWING_LIMIT)
    .sort((a, b) => releasedBy(a).localeCompare(releasedBy(b)));

  return { soon, theatres };
}

function mergeFeatureCandidates(
  trending: readonly FeaturedMovie[],
  popular: PulseRow["popular"],
): FeatureCandidate[] {
  const world: FeatureCandidate[] = trending.map((movie, rank) => ({
    backdropPath: movie.backdropPath,
    id: movie.id,
    social: null,
    trending: rank + 1,
  }));
  const members: FeatureCandidate[] = popular.map((film) => ({
    backdropPath: film.backdrop_path ?? null,
    id: film.tmdb_id,
    social: film,
    trending: null,
  }));
  const find = (list: FeatureCandidate[], id: number) =>
    list.find((candidate) => candidate.id === id);

  return fuseRankings([world, members], (candidate) => candidate.id)
    .map(({ item }) => ({
      ...item,
      social: item.social ?? find(members, item.id)?.social ?? null,
      trending: item.trending ?? find(world, item.id)?.trending ?? null,
    }))
    .filter((candidate) => candidate.backdropPath)
    .slice(0, FEATURE_LIMIT + FEATURE_SPARE_CANDIDATES);
}

function toFeature(
  candidate: FeatureCandidate,
  movie: MovieDetails,
): Feature | null {
  const backdropPath = movie.backdropPath ?? candidate.backdropPath;
  if (!backdropPath) return null;
  const { social } = candidate;
  return {
    backdropPath,
    genres: movie.genres.slice(0, FEATURE_GENRE_LIMIT).map(({ name }) => name),
    id: movie.id,
    logline: featureLogline(movie.overview),
    logo: pickLogo(movie.images.logos),
    posterPath: movie.posterPath,
    runtime: movie.runtimeMinutes,
    social: social
      ? {
          faces: social.faces.map(toMember),
          rating: social.rating,
          watchers: social.members,
        }
      : null,
    title: movie.title,
    trending: candidate.trending,
    year: movie.releaseYear,
  };
}

function toPulseShelves(pulse: PulseRow): PulseShelves {
  const shown = new Set<number>();
  const popular = takeUnseen(
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
    POPULAR_LIMIT,
  );
  const rising = takeUnseen(
    pulse.rising
      .filter((row) => row.lift >= 1)
      .map((row) => ({
        ...toFilm(row),
        lift: row.lift,
        week: row.week,
      })),
    shown,
    RISING_LIMIT,
  );

  return {
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
    popular,
    rated: pulse.top_rated
      .filter((row) => row.poster_path)
      .slice(0, ROW_LIMIT)
      .sort((a, b) => b.rating - a.rating || b.ratings - a.ratings)
      .map((row) => ({
        ...toFilm(row),
        rating: row.rating,
        ratings: row.ratings,
      })),
    reviews: pulse.reviews.slice(0, REVIEW_LIMIT).map((row) => ({
      author: toMember(row.author),
      content: row.content,
      createdAt: row.created_at,
      film: toFilm(row),
      id: row.id,
      likes: row.likes_count,
      rating: row.rating,
    })),
    rising,
  };
}

function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

async function readPulse(signal?: AbortSignal): Promise<PulseRow> {
  const query = admin().call("get_home_pulse");
  const data = await (signal ? abortable(query, signal) : query);
  return (data as PulseRow | null) ?? EMPTY_PULSE;
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
    const session = await getViewerSession();
    return (
      ((await session.call("get_home_circle")) as CircleRow | null) ?? null
    );
  } catch (error) {
    unstable_rethrow(error);
    report("Home circle read", error);
    return null;
  }
}

async function getRecentLogs(): Promise<RecentLog[]> {
  try {
    const data = await admin()
      .db.select({
        author: {
          avatar_url: accounts.avatarUrl,
          display_name: accounts.displayName,
          username: accounts.username,
        },
        backdrop_path: accountDiary.backdropPath,
        id: accountDiary.id,
        is_rewatch: accountDiary.isRewatch,
        poster_path: accountDiary.posterPath,
        release_date: accountDiary.releaseDate,
        title: accountDiary.title,
        tmdb_id: accountDiary.tmdbId,
        watched_at: accountDiary.watchedAt,
      })
      .from(accountDiary)
      .innerJoin(accounts, eq(accounts.id, accountDiary.accountId))
      .where(
        and(
          eq(accounts.isActive, true),
          eq(accounts.isPrivate, false),
          isNotNull(accounts.username),
          isNotNull(accountDiary.posterPath),
        ),
      )
      .orderBy(desc(accountDiary.watchedAt))
      .limit(LOGGED_SCAN);
    const seen = new Set<number>();
    const logs: RecentLog[] = [];
    for (const row of data) {
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
    const { db } = await getViewerSession();
    const data = await db
      .select({
        tmdbId: filmStats.tmdbId,
        watchlistCount: filmStats.watchlistCount,
      })
      .from(filmStats)
      .where(inArray(filmStats.tmdbId, ids));
    for (const row of data) {
      if (row.tmdbId !== null) waiting.set(row.tmdbId, row.watchlistCount ?? 0);
    }
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

export const getHomeFeed = cache(async (): Promise<HomeFeed> => {
  const [week, playing, upcoming, upcomingNext, pulse, circleRow, logged] =
    await Promise.all([
      getTrendingMovies("week"),
      getMovieList("now_playing"),
      getMovieList("upcoming"),
      getMovieList("upcoming", { page: 2 }),
      getPulse(),
      getCircle(),
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

  const [films, circle, waiting] = await Promise.all([
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
    features: rotate(films, Math.floor(Math.random() * films.length)),
    logged,
    members: selectMembers(pulse, circleRow),
    pulse: pulse.counts,
    soon: soon.map(toShowing),
    theatres: theatres.map(toShowing),
  };
});
