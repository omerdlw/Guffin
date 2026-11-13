import "server-only";

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

const PROFILE_ACTIVITY_COLUMNS =
  "id, type, tmdb_id, media_type, payload, created_at, target:accounts!account_activity_target_account_id_fkey(username, display_name)";

const SUMMARY_PAGE = 1000;

const SUMMARY_PAGES = 10;

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

  let query = client
    .from("account_activity")
    .select(PROFILE_ACTIVITY_COLUMNS, { count: "exact" })
    .eq("account_id", accountId)
    .or(`media_type.is.null,media_type.eq.${mediaType}`);
  if (types.length > 0) query = query.in("type", [...types]);

  const result = await readPage(
    query
      .order("created_at", { ascending: filters.sort === "oldest" })
      .order("id"),
    filters.page,
    ACTIVITY_PAGE_SIZE,
  );

  return paged(
    (result.rows as unknown as ActivityRow[]).map((row) =>
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

  const stamps: string[] = [];
  for (let page = 0; page < SUMMARY_PAGES; page += 1) {
    const { data, error } = await client
      .from("account_activity")
      .select("created_at")
      .eq("account_id", accountId)
      .gte("created_at", new Date(from).toISOString())
      .order("created_at", { ascending: false })
      .range(page * SUMMARY_PAGE, (page + 1) * SUMMARY_PAGE - 1);
    if (error) throw error;
    for (const row of data ?? []) stamps.push(row.created_at);
    if ((data?.length ?? 0) < SUMMARY_PAGE) break;
  }

  const counts = new Array<number>(
    Math.round((today - from) / DAY_MS) + 1,
  ).fill(0);
  let week = 0;
  let month = 0;
  let year = 0;

  for (const stamp of stamps) {
    const at = Date.parse(stamp);
    const day = Math.floor((at - from) / DAY_MS);
    if (day >= 0 && day < counts.length) counts[day] += 1;
    const age = today + DAY_MS - at;
    if (age <= 7 * DAY_MS) week += 1;
    if (age <= 30 * DAY_MS) month += 1;
    if (age <= 365 * DAY_MS) year += 1;
  }

  return {
    days: { counts, from: new Date(from).toISOString().slice(0, 10) },
    month,
    week,
    year,
  };
}
