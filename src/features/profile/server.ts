import "server-only";
import type { MediaType } from "@/features/catalog/types";
import { readListPreviews } from "@/features/lists/server";
import {
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_SUMMARY_WEEKS,
  ACTIVITY_TYPES,
  DAY_MS,
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
  PROFILE_ACTIVITY_COLUMNS,
  PROFILE_LIST_COLUMNS,
  PROFILE_REVIEW_COLUMNS,
  REVIEW_PAGE_SIZE,
  REVIEW_SORT_COLUMNS,
  SUMMARY_PAGE,
  SUMMARY_PAGES,
} from "./constants";
import type {
  AccountOverviewData,
  ActivityFilters,
  ActivityItem,
  ActivityRow,
  ActivitySummary,
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
  pageCount,
  paged,
  pageRange,
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
