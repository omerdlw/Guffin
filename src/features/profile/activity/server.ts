import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { paged } from "@/features/profile/params";
import {
  type ActivityFilters,
  type ActivityGroup,
  type ActivityItem,
  type ActivityRow,
  type ActivitySummary,
  DAY_MS,
  type Paged,
  type ProfileClient,
  toActivityItem,
} from "@/features/profile/profile";
import { readPage } from "@/features/profile/server";
import { accountActivity, accounts } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb/shared";

const ACTIVITY_PAGE_SIZE = 30;

const ACTIVITY_TYPES: Record<ActivityGroup, readonly string[]> = {
  all: [],
  diary: [
    "WATCH_DIARY_LOGGED",
    "WATCH_DIARY_REWATCHED",
    "EPISODE_WATCHED",
    "SEASON_WATCHED",
  ],
  follows: ["FOLLOW_CREATED"],
  likes: ["LIKED_ADDED"],
  lists: ["LIST_CREATED", "LIST_LIKED", "LIST_COMMENTED"],
  reviews: ["REVIEW_PUBLISHED", "RATING_LOGGED", "REVIEW_LIKED"],
  watched: ["WATCHED_ADDED", "SHOW_STARTED", "SHOW_COMPLETED"],
  watchlist: ["WATCHLIST_ADDED"],
};

const ACTIVITY_SUMMARY_WEEKS = 104;

const PROFILE_ACTIVITY_COLUMNS = {
  created_at: accountActivity.createdAt,
  id: accountActivity.id,
  media_type: accountActivity.mediaType,
  payload: accountActivity.payload,
  target: {
    display_name: accounts.displayName,
    username: sql<string>`${accounts.username}`,
  },
  tmdb_id: accountActivity.tmdbId,
  type: accountActivity.type,
};

export async function getActivityPage({
  accountId,
  accountUsername,
  client,
  filters,
  mediaType = "movie",
}: {
  accountId: string;
  accountUsername: string;
  client: ProfileClient;
  filters: ActivityFilters;
  mediaType?: MediaType;
}): Promise<Paged<ActivityItem>> {
  const types = ACTIVITY_TYPES[filters.group];

  const where = and(
    eq(accountActivity.accountId, accountId),
    or(
      isNull(accountActivity.mediaType),
      eq(accountActivity.mediaType, mediaType),
    ),
    types.length > 0 ? inArray(accountActivity.type, [...types]) : undefined,
  );

  const result = await readPage(
    {
      count: async () => {
        const [row] = await client.db
          .select({ total: count() })
          .from(accountActivity)
          .where(where);
        return row?.total ?? 0;
      },
      rows: (limit, offset) =>
        client.db
          .select(PROFILE_ACTIVITY_COLUMNS)
          .from(accountActivity)
          .leftJoin(accounts, eq(accounts.id, accountActivity.targetAccountId))
          .where(where)
          .orderBy(
            filters.sort === "oldest"
              ? asc(accountActivity.createdAt)
              : desc(accountActivity.createdAt),
            asc(accountActivity.id),
          )
          .limit(limit)
          .offset(offset),
    },
    filters.page,
    ACTIVITY_PAGE_SIZE,
  );

  return paged(
    (result.rows as ActivityRow[]).map((row) =>
      toActivityItem(row, accountUsername),
    ),
    result.count,
    result.page,
    ACTIVITY_PAGE_SIZE,
  );
}

export async function getActivitySummary({
  accountId,
  client,
}: {
  accountId: string;
  client: ProfileClient;
}): Promise<ActivitySummary> {
  const now = Date.now();
  const today = now - (now % DAY_MS);
  const monday = (new Date(today).getUTCDay() + 6) % 7;
  const from = today - (monday + (ACTIVITY_SUMMARY_WEEKS - 1) * 7) * DAY_MS;

  const utcDay = sql<string>`(${accountActivity.createdAt} at time zone 'UTC')::date`;
  const days = await client.db
    .select({ day: utcDay, total: count() })
    .from(accountActivity)
    .where(
      and(
        eq(accountActivity.accountId, accountId),
        gte(accountActivity.createdAt, new Date(from).toISOString()),
      ),
    )
    .groupBy(utcDay);

  const counts = new Array<number>(
    Math.round((today - from) / DAY_MS) + 1,
  ).fill(0);
  let week = 0;
  let month = 0;
  let year = 0;

  for (const { day: stamp, total } of days) {
    const at = Date.parse(`${stamp}T00:00:00Z`);
    const day = Math.round((at - from) / DAY_MS);
    if (day >= 0 && day < counts.length) counts[day] += total;
    const age = today + DAY_MS - at;
    if (age <= 7 * DAY_MS) week += total;
    if (age <= 30 * DAY_MS) month += total;
    if (age <= 365 * DAY_MS) year += total;
  }

  return {
    days: { counts, from: new Date(from).toISOString().slice(0, 10) },
    month,
    week,
    year,
  };
}
