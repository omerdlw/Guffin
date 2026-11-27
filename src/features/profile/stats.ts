import "server-only";

import { and, countDistinct, eq, gte, sql } from "drizzle-orm";
import type { Session } from "@/infrastructure/db/client";
import {
  accountActivity,
  accountDiary,
  accountStats,
} from "@/infrastructure/db/schema";

const DAY_MS = 86_400_000;

const ACTIVITY_WEEKS = 53;

export interface ProfileStats {
  followers: number;
  following: number;
  lists: number;
  thisYear: number;
  watched: number;
  watchlist: number;
}

export interface ActivityDays {
  counts: number[];
  from: string;
}

export interface ProfileNumbers {
  activity: ActivityDays;
  stats: ProfileStats;
}

async function watchedThisYear(
  session: Session,
  accountId: string,
): Promise<number> {
  const year = `${new Date().getUTCFullYear()}-01-01`;
  const [row] = await session.db
    .select({ total: countDistinct(accountDiary.tmdbId) })
    .from(accountDiary)
    .where(
      and(
        eq(accountDiary.accountId, accountId),
        gte(accountDiary.watchedOn, year),
      ),
    );
  return row?.total ?? 0;
}

async function activityDays(
  session: Session,
  accountId: string,
): Promise<ActivityDays> {
  const now = Date.now();
  const today = now - (now % DAY_MS);
  const weekday = (new Date(today).getUTCDay() + 6) % 7;
  const from = today - (weekday + (ACTIVITY_WEEKS - 1) * 7) * DAY_MS;

  const day = sql<string>`(${accountActivity.createdAt} at time zone 'UTC')::date`;
  const total = sql<number>`count(*)::int`;
  const rows = await session.db
    .select({ day, total })
    .from(accountActivity)
    .where(
      and(
        eq(accountActivity.accountId, accountId),
        gte(accountActivity.createdAt, new Date(from).toISOString()),
      ),
    )
    .groupBy(day);

  const counts = new Array<number>(
    Math.round((today - from) / DAY_MS) + 1,
  ).fill(0);
  for (const row of rows) {
    const index = Math.round(
      (Date.parse(`${row.day}T00:00:00Z`) - from) / DAY_MS,
    );
    if (index >= 0 && index < counts.length) counts[index] += row.total;
  }
  return { counts, from: new Date(from).toISOString().slice(0, 10) };
}

export async function getProfileNumbers({
  accountId,
  session,
}: {
  accountId: string;
  session: Session;
}): Promise<ProfileNumbers | null> {
  const [[row], thisYear, activity] = await Promise.all([
    session.db
      .select()
      .from(accountStats)
      .where(eq(accountStats.accountId, accountId)),
    watchedThisYear(session, accountId),
    activityDays(session, accountId),
  ]);
  if (!row) return null;

  return {
    activity,
    stats: {
      followers: row.followersCount,
      following: row.followingCount,
      lists: row.listsCount,
      thisYear,
      watched: row.watchedCount,
      watchlist: row.watchlistCount,
    },
  };
}
