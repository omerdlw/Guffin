import "server-only";
import { cache } from "react";
import {
  AmbientDecoderMissingError,
  type AmbientPalette,
  extractAmbientPalette,
} from "@omerdlw/base-framework/ambient/server";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getPublicAccount } from "@/features/account/server";
import { getOptionalUser } from "@/features/auth/server";
import type { MediaType } from "@/features/catalog/types";
import type { ContinueItem, ShowStatus } from "@/features/tv/types";
import { isShowStatus } from "@/features/tv/utils";
import { readListPreviews } from "@/features/lists/server";
import { toPerson } from "@/features/social/utils";
import { isPublicHttps, pinnedFetch } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_SUMMARY_WEEKS,
  ACTIVITY_TYPES,
  DIARY_MONTH_LIMIT,
  EMPTY_HEADER,
  EMPTY_LIBRARY_COUNTS,
  EMPTY_OVERVIEW,
  LIST_COMMENTS_LIMIT,
  LIST_PAGE_SIZE,
  LIST_PREVIEW_POSTERS,
  LIST_SORT_COLUMNS,
  MEDIA_PAGE_SIZE,
  MEDIA_SORT_COLUMNS,
  MEDIA_TABLES,
  MOVIE_COLUMNS,
  PALETTE_BUDGET_MS,
  PALETTE_MAX_BYTES,
  PALETTE_REVALIDATE_SECONDS,
  PALETTE_TIMEOUT_MS,
  PALETTE_VERSION,
  PROFILE_ACTIVITY_COLUMNS,
  PROFILE_LIST_COLUMNS,
  PROFILE_REVIEW_COLUMNS,
  REVIEW_PAGE_SIZE,
  REVIEW_SORT_COLUMNS,
  TMDB_IMAGE,
  WATCHING_SHELF_LIMIT,
} from "./constants";
import type {
  AccountHeader,
  AccountOverviewData,
  AccountPageContext,
  ActivityFilters,
  ActivityItem,
  ActivityRow,
  ActivitySummary,
  DiaryEntryRow,
  DiaryMonth,
  HeaderRow,
  ListCardData,
  ListItemFilters,
  ListPageData,
  ListPageRow,
  ListRow,
  ListSort,
  MediaFilters,
  MediaItem,
  MediaKind,
  MovieRow,
  OverviewRow,
  Paged,
  PageResult,
  ProfileClient,
  ReviewCardData,
  ReviewFilters,
  ReviewRow,
} from "./types";
import {
  filterMovies,
  likePattern,
  monthBounds,
  pageCount,
  paged,
  pageRange,
  releaseYear,
  reviewCards,
  toActivityItem,
  toListCard,
  toMediaItem,
  toReviewCard,
} from "./utils";

async function readPage<Row>(
  query: { range(from: number, to: number): PromiseLike<PageResult<Row>> },
  page: number,
  size: number,
  retried = false,
): Promise<{ count: number | null; page: number; rows: Row[] }> {
  const { from, to } = pageRange(page, size);
  const result = await query.range(from, to);
  if (result.error?.code === "PGRST103" && !retried) {
    const rows = Number(
      /only (\d+) rows/.exec(result.error.details ?? "")?.[1],
    );
    const last = Math.max(1, pageCount(Number.isFinite(rows) ? rows : 0, size));
    return readPage(query, last, size, true);
  }
  if (result.error) throw result.error;
  return { count: result.count, page, rows: result.data ?? [] };
}

export async function getMediaPage({
  accountId,
  client,
  filters,
  kind,
  mediaType = "movie",
}: {
  accountId: string;
  client: ProfileClient;
  filters: MediaFilters;
  kind: MediaKind;
  mediaType?: MediaType;
}): Promise<Paged<MediaItem>> {
  const added = kind === "watched" ? "last_watched_at" : "created_at";

  const query = filterMovies(
    client
      .from(MEDIA_TABLES[kind] as "account_likes")
      .select(MOVIE_COLUMNS, { count: "exact" })
      .eq("account_id", accountId)
      .eq("media_type", mediaType),
    filters,
  );

  const [sortKey, ascending] = MEDIA_SORT_COLUMNS[filters.sort];
  const column = sortKey === "added" ? added : sortKey;

  const [result, favorites] = await Promise.all([
    readPage(
      query
        .order(column as "created_at", { ascending, nullsFirst: false })
        .order("tmdb_id", { ascending: false }),
      filters.page,
      MEDIA_PAGE_SIZE,
    ),
    kind === "likes"
      ? client
          .from("account_favorites")
          .select("tmdb_id")
          .eq("account_id", accountId)
          .eq("media_type", mediaType)
      : null,
  ]);

  const pinned = new Set((favorites?.data ?? []).map((row) => row.tmdb_id));
  return paged(
    (result.rows as MovieRow[]).map((row) =>
      toMediaItem(row, pinned, mediaType),
    ),
    result.count,
    result.page,
    MEDIA_PAGE_SIZE,
  );
}

async function withPreviews(
  client: ProfileClient,
  rows: ListRow[],
): Promise<ListCardData[]> {
  const previews = await readListPreviews(
    client,
    rows.map((row) => row.id),
    LIST_PREVIEW_POSTERS,
  );
  return rows.map((row) => toListCard(row, previews.get(row.id) ?? []));
}

export async function getListsPage({
  accountId,
  client,
  mediaType = "movie",
  page,
  sort,
}: {
  accountId: string;
  client: ProfileClient;
  mediaType?: MediaType;
  page: number;
  sort: ListSort;
}): Promise<Paged<ListCardData>> {
  const [column, ascending] = LIST_SORT_COLUMNS[sort];

  const result = await readPage(
    client
      .from("lists")
      .select(PROFILE_LIST_COLUMNS, { count: "exact" })
      .eq("account_id", accountId)
      .eq("media_type", mediaType)
      .order(column as "created_at", { ascending })
      .order("id"),
    page,
    LIST_PAGE_SIZE,
  );

  return paged(
    await withPreviews(client, result.rows as ListRow[]),
    result.count,
    result.page,
    LIST_PAGE_SIZE,
  );
}

export async function getListPage({
  client,
  comments = LIST_COMMENTS_LIMIT,
  filters,
  owner,
  slug,
}: {
  client: ProfileClient;
  comments?: number;
  filters: ListItemFilters;
  owner: { displayName: string; id: string; username: string };
  slug: string;
}): Promise<ListPageData | null> {
  const { data, error } = await client.rpc("get_list_page", {
    p_account_id: owner.id,
    p_comments: comments,
    p_decade: filters.decade,
    p_genre: filters.genre,
    p_page: filters.page,
    p_page_size: MEDIA_PAGE_SIZE,
    p_pattern: filters.query ? likePattern(filters.query) : null,
    p_slug: slug,
    p_sort: filters.sort,
  });
  if (error) throw error;

  const row = data as unknown as ListPageRow | null;
  if (!row) return null;
  const list = row.list;

  return {
    commentCount: row.comments.total,
    comments: row.comments.rows.map((comment) => ({
      author: {
        avatarUrl: comment.author.avatar_url,
        displayName: comment.author.display_name || comment.author.username,
        id: comment.author.id,
        username: comment.author.username,
      },
      content: comment.content,
      createdAt: comment.created_at,
      id: comment.id,
      liked: comment.liked,
      likesCount: comment.likes_count,
    })),
    items: paged(
      row.items.map((item) =>
        toMediaItem(item, new Set(), list.media_type === "tv" ? "tv" : "movie"),
      ),
      row.items_total,
      row.page,
      MEDIA_PAGE_SIZE,
    ),
    list: {
      description: list.description,
      id: list.id,
      isPrivate: list.is_private,
      isRanked: list.is_ranked,
      itemsCount: list.items_count,
      liked: list.liked,
      likesCount: list.likes_count,
      mediaType: list.media_type === "tv" ? "tv" : "movie",
      owner: {
        displayName: owner.displayName || owner.username,
        id: owner.id,
        username: owner.username,
      },
      posterPath: list.poster_path,
      reviewsCount: list.reviews_count,
      slug: list.slug,
      title: list.title,
      updatedAt: list.updated_at,
    },
    ownComment: row.own_comment,
  };
}

async function likedReviewIds(
  client: ProfileClient,
  viewerId: string | null,
  reviewIds: string[],
): Promise<Set<string>> {
  if (!viewerId || reviewIds.length === 0) return new Set();
  const { data } = await client
    .from("review_likes")
    .select("review_id")
    .eq("account_id", viewerId)
    .in("review_id", reviewIds);
  return new Set((data ?? []).map((row) => row.review_id));
}

export async function getReviewsPage({
  accountId,
  client,
  filters,
  mediaType = "movie",
  viewerId,
}: {
  accountId: string;
  client: ProfileClient;
  filters: ReviewFilters;
  mediaType?: MediaType;
  viewerId: string | null;
}): Promise<Paged<ReviewCardData>> {
  let query = client
    .from("reviews")
    .select(PROFILE_REVIEW_COLUMNS, { count: "exact" })
    .eq("account_id", accountId)
    .eq("media_type", mediaType)
    .not("tmdb_id", "is", null);

  if (filters.kind === "written") query = query.neq("content", "");
  if (filters.kind === "ratings") query = query.eq("content", "");
  if (filters.query) {
    const pattern = likePattern(filters.query);
    query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  const [column, ascending] = REVIEW_SORT_COLUMNS[filters.sort];

  const result = await readPage(
    query
      .order(column as "created_at", { ascending, nullsFirst: false })
      .order("id"),
    filters.page,
    REVIEW_PAGE_SIZE,
  );

  const rows = result.rows as ReviewRow[];
  const liked = await likedReviewIds(
    client,
    viewerId,
    rows.map((row) => row.id),
  );

  return paged(
    rows.flatMap((row) => toReviewCard(row, liked)),
    result.count,
    result.page,
    REVIEW_PAGE_SIZE,
  );
}

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

const DAY = 86_400_000;
const SUMMARY_PAGE = 1000;
const SUMMARY_PAGES = 10;

export async function getActivitySummary({
  accountId,
  client,
}: {
  accountId: string;
  client: ProfileClient;
}): Promise<ActivitySummary> {
  const now = Date.now();
  const today = now - (now % DAY);
  const monday = (new Date(today).getUTCDay() + 6) % 7;
  const from = today - (monday + (ACTIVITY_SUMMARY_WEEKS - 1) * 7) * DAY;

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

  const counts = new Array<number>(Math.round((today - from) / DAY) + 1).fill(
    0,
  );
  let week = 0;
  let month = 0;
  let year = 0;

  for (const stamp of stamps) {
    const at = Date.parse(stamp);
    const day = Math.floor((at - from) / DAY);
    if (day >= 0 && day < counts.length) counts[day] += 1;
    const age = today + DAY - at;
    if (age <= 7 * DAY) week += 1;
    if (age <= 30 * DAY) month += 1;
    if (age <= 365 * DAY) year += 1;
  }

  return {
    days: { counts, from: new Date(from).toISOString().slice(0, 10) },
    month,
    week,
    year,
  };
}

export async function getAccountOverview({
  accountId,
  accountUsername,
  client,
  limits,
  mediaType = "movie",
}: {
  accountId: string;
  accountUsername: string;
  client: ProfileClient;
  mediaType?: MediaType;
  limits: {
    activity: number;
    diary: number;
    following: number;
    lists: number;
    popular: number;
    reviews: number;
    watched: number;
    watchlist: number;
  };
}): Promise<AccountOverviewData> {
  const { data, error } = await client.rpc("get_account_overview", {
    p_account_id: accountId,
    p_activity: limits.activity,
    p_diary: limits.diary,
    p_following: limits.following,
    p_media_type: mediaType,
    p_lists: limits.lists,
    p_popular: limits.popular,
    p_reviews: limits.reviews,
    p_watched: limits.watched,
    p_watchlist: limits.watchlist,
  });
  if (error) throw error;

  const row = (data as unknown as OverviewRow | null) ?? EMPTY_OVERVIEW;
  const stats = row.stats;
  const none = new Set<number>();

  return {
    activity: row.activity.map((item) => toActivityItem(item, accountUsername)),
    activityDays: {
      counts: (row.activity_days?.counts ?? []).map(Number),
      from: row.activity_days?.from ?? "",
    },
    counts: stats
      ? {
          diary: stats.diary_count,
          likes: stats.likes_count,
          lists: stats.lists_count,
          reviews: stats.reviews_count,
          watched: stats.watched_count,
          watchlist: stats.watchlist_count,
        }
      : EMPTY_LIBRARY_COUNTS,
    diary: row.diary.map((entry) => ({
      id: entry.id,
      title: entry.title,
      tmdbId: entry.tmdb_id,
      watchedOn: entry.watched_on,
    })),
    favorites: row.favorites.map((film) => toMediaItem(film, none, mediaType)),
    following: row.following.map((person) => ({
      avatarUrl: person.avatar_url,
      displayName: person.display_name || person.username,
      username: person.username,
    })),
    followingCount: stats?.following_count ?? 0,
    lists: row.lists.map((list) => toListCard(list, list.previews)),
    popular: reviewCards(row.popular_reviews),
    reviews: reviewCards(row.recent_reviews),
    spread: Array.from(
      { length: 10 },
      (_, index) => Number(row.rating_spread?.[index]) || 0,
    ),
    watched: row.watched.map((film) => toMediaItem(film, none, mediaType)),
    watchlist: row.watchlist.map((film) => toMediaItem(film, none, mediaType)),
  };
}

/** Shows an account is in the middle of (RLS hides a locked account's). */
export function getWatchingShows(options: {
  accountId: string;
  client: ProfileClient;
}): Promise<ContinueItem[]> {
  return getTrackedShows({
    ...options,
    limit: WATCHING_SHELF_LIMIT,
    statuses: ["watching"],
  });
}

/** An account's tracked shows in the given statuses, last watched first. */
export async function getTrackedShows({
  accountId,
  client,
  limit,
  statuses,
}: {
  accountId: string;
  client: ProfileClient;
  limit: number;
  statuses: readonly ShowStatus[];
}): Promise<ContinueItem[]> {
  const { data, error } = await client
    .from("account_show_progress")
    .select(
      "show_id, status, title, poster_path, backdrop_path, watched_episodes, aired_episodes, last_season, last_episode",
    )
    .eq("account_id", accountId)
    .in("status", [...statuses])
    .order("last_watched_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    report("Tracked shows read", error);
    return [];
  }
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
}

export async function getDiaryMonth({
  accountId,
  client,
  mediaType = "movie",
  month,
}: {
  accountId: string;
  client: ProfileClient;
  mediaType?: MediaType;
  month: string | null;
}): Promise<DiaryMonth> {
  const edge = (ascending: boolean) =>
    client
      .from("account_diary")
      .select("watched_on")
      .eq("account_id", accountId)
      .eq("media_type", mediaType)
      .order("watched_on", { ascending })
      .limit(1)
      .maybeSingle();

  const [first, last] = await Promise.all([edge(true), edge(false)]);
  const firstMonth = first.data?.watched_on.slice(0, 7) ?? null;
  const lastMonth = last.data?.watched_on.slice(0, 7) ?? null;
  const target = month ?? lastMonth ?? new Date().toISOString().slice(0, 7);

  const { from, to } = monthBounds(target);
  const { data, error } = await client
    .from("account_diary")
    .select(
      "id, tmdb_id, title, poster_path, release_date, watched_on, is_rewatch",
    )
    .eq("account_id", accountId)
    .eq("media_type", mediaType)
    .gte("watched_on", from)
    .lt("watched_on", to)
    .order("watched_on", { ascending: false })
    .order("watched_at", { ascending: false })
    .limit(DIARY_MONTH_LIMIT);
  if (error) throw error;

  const entries = (data ?? []) as DiaryEntryRow[];
  const reviews =
    entries.length > 0
      ? await client
          .from("reviews")
          .select("tmdb_id, rating, content")
          .eq("account_id", accountId)
          .eq("media_type", mediaType)
          .in("tmdb_id", [...new Set(entries.map((entry) => entry.tmdb_id))])
      : null;
  const byMovie = new Map(
    (reviews?.data ?? []).flatMap((review) =>
      review.tmdb_id === null ? [] : [[review.tmdb_id, review] as const],
    ),
  );

  return {
    first: firstMonth,
    last: lastMonth,
    month: target,
    rows: entries.map((entry) => {
      const review = byMovie.get(entry.tmdb_id);
      return {
        hasReview: Boolean(review?.content.trim()),
        id: entry.id,
        isRewatch: entry.is_rewatch,
        posterPath: entry.poster_path,
        rating:
          review?.rating === null || review?.rating === undefined
            ? null
            : Number(review.rating),
        title: entry.title,
        tmdbId: entry.tmdb_id,
        watchedOn: entry.watched_on,
        year: releaseYear(entry.release_date),
      };
    }),
  };
}

async function isAcceptedFollower(
  client: ProfileClient,
  targetId: string,
  viewerId?: string,
): Promise<boolean> {
  if (!viewerId || viewerId === targetId) return false;

  const { data } = await client
    .from("account_follows")
    .select("status")
    .eq("follower_id", viewerId)
    .eq("following_id", targetId)
    .maybeSingle();
  return data?.status === "accepted";
}

const readViewer = cache(getOptionalUser);

const readAccountAndViewer = cache(async (username: string) => {
  const client = await createServerSupabaseClient();
  const [account, viewer] = await Promise.all([
    getPublicAccount({ client, username }),
    readViewer(),
  ]);
  return { account, client, viewer };
});

const readFollowerStatus = cache(isAcceptedFollower);

export async function getAccountPageContext(
  username: string,
): Promise<AccountPageContext> {
  let handle: string;
  try {
    handle = decodeURIComponent(username);
  } catch {
    notFound();
  }

  const { account, client, viewer } = await readAccountAndViewer(handle);
  if (!account) notFound();

  const isOwner = viewer?.id === account.id;
  const locked =
    account.isPrivate &&
    !isOwner &&
    !(await readFollowerStatus(client, account.id, viewer?.id));

  return {
    account,
    client,
    isOwner,
    locked,
    viewerId: viewer?.id ?? null,
  };
}

export async function getUnlockedAccountContext(
  username: string,
): Promise<AccountPageContext | null> {
  const context = await getAccountPageContext(username);
  return context.locked ? null : context;
}

export async function getAccountHeader({
  accountId,
  client,
}: {
  accountId: string;
  client: ProfileClient;
}): Promise<AccountHeader> {
  const { data, error } = await client.rpc("get_account_header", {
    p_account_id: accountId,
  });
  if (error) {
    report("Account header read", error);
    return EMPTY_HEADER;
  }

  const row = data as unknown as HeaderRow | null;
  if (!row) return EMPTY_HEADER;

  return {
    followersCount: row.followers_count,
    followingCount: row.following_count,
    followStatus: row.follow_status,
    library: row.library && {
      lists: row.library.lists,
      reviews: row.library.reviews,
      shows: row.library.shows ?? 0,
      thisYear: row.library.this_year,
      watched: row.library.watched,
    },
    mutual: row.mutual && {
      people: row.mutual.people.map(toPerson),
      total: row.mutual.total,
    },
  };
}

class NoPalette extends Error {}

const readPalette = unstable_cache(
  async (url: string): Promise<AmbientPalette> => {
    const palette = await extractAmbientPalette(url, {
      allow: isPublicHttps,
      fetch: pinnedFetch,
      maxBytes: PALETTE_MAX_BYTES,
      timeoutMs: PALETTE_TIMEOUT_MS,
    });
    if (!palette) throw new NoPalette(url);
    return palette;
  },
  [PALETTE_VERSION],
  { revalidate: PALETTE_REVALIDATE_SECONDS },
);

export async function getAccountAmbientPalette(
  url: string | null | undefined,
): Promise<AmbientPalette | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;

  const reading = readPalette(url.replace(TMDB_IMAGE, "$1w300$2")).then(
    (palette): AmbientPalette => ({ ...palette, source: url }),
    (error) => {
      if (error instanceof AmbientDecoderMissingError) report("Ambient", error);
      return null;
    },
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"late">((resolve) => {
    timer = setTimeout(resolve, PALETTE_BUDGET_MS, "late");
  });
  const palette = await Promise.race([reading, late]);
  clearTimeout(timer);

  if (palette !== "late") return palette;
  after(() => reading);
  return null;
}
