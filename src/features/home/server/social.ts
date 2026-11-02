import "server-only";

import { after } from "next/server";
import { report } from "@omerdlw/base-framework/utils";
import { getOptionalUser } from "@/features/auth/server";
import { getRedisClient } from "@/infrastructure/redis";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/infrastructure/supabase/server";

export interface MemberRow {
  avatar_url: string | null;
  display_name: string | null;
  username: string;
}

export interface FilmRow {
  backdrop_path?: string | null;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
}

export interface PulseRow {
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

export interface CircleRow {
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
const PULSE_KEEP_SECONDS = 60 * 60;

interface CachedPulse {
  at: number;
  pulse: PulseRow;
}

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
      .catch((error: unknown) => report("Home pulse cache write", error));
  }
  return pulse;
}

export async function getPulse(): Promise<PulseRow> {
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
      report("Home pulse cache read", error);
    }
  }

  try {
    return await recount();
  } catch (error) {
    report("Home pulse read", error);
    return EMPTY_PULSE;
  }
}

export async function getCircle(): Promise<CircleRow | null> {
  try {
    if (!(await getOptionalUser())) return null;
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("get_home_circle");
    if (error) throw error;
    return (data as unknown as CircleRow | null) ?? null;
  } catch (error) {
    report("Home circle read", error);
    return null;
  }
}

export async function getWaiting(ids: number[]): Promise<Map<number, number>> {
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
    report("Home film stats read", error);
  }
  return waiting;
}
