import "server-only";

import { readListPreviews } from "@/features/lists/server";
import { paged } from "@/features/profile/params";
import {
  likePattern,
  type ListCardData,
  type ListItemFilters,
  type ListPageData,
  type ListRow,
  type ListSort,
  MEDIA_PAGE_SIZE,
  type MovieRow,
  type Paged,
  type ProfileClient,
  toListCard,
  toMediaItem,
} from "@/features/profile/profile";
import { readPage } from "@/features/profile/server";
import type { MediaType } from "@/lib/tmdb/shared";

interface ListPageRow {
  comments: {
    rows: {
      author: {
        avatar_url: string | null;
        display_name: string | null;
        id: string;
        username: string;
      };
      content: string;
      created_at: string;
      id: string;
      liked: boolean;
      likes_count: number;
    }[];
    total: number;
  };
  items: MovieRow[];
  items_total: number;
  list: ListRow & { liked: boolean; poster_path: string | null };
  own_comment: string | null;
  page: number;
}

const LIST_PAGE_SIZE = 18;

const LIST_SORT_COLUMNS = {
  created_asc: ["created_at", true],
  created_desc: ["created_at", false],
  items_desc: ["items_count", false],
  likes_desc: ["likes_count", false],
  title_asc: ["title", true],
  updated_desc: ["updated_at", false],
} as const;

const LIST_PREVIEW_POSTERS = 5;

const LIST_COMMENTS_LIMIT = 50;

const PROFILE_LIST_COLUMNS =
  "id, slug, title, description, is_private, is_ranked, items_count, likes_count, reviews_count, updated_at";

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
