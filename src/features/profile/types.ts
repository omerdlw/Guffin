import type { MediaType } from "@/features/catalog/types";
import type { AmbientPalette } from "@omerdlw/base-framework/ambient";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComponentProps,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import type { PublicAccount } from "@/features/account/types";
import type { MutualFollowers } from "@/features/social/types";
import type { SearchParams } from "@/lib/http";
import type { Database } from "@/lib/supabase/database.types";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
  LIST_ITEM_SORTS,
  LIST_SORTS,
  MEDIA_SORTS,
  REVIEW_KINDS,
  REVIEW_SORTS,
  SECTION_TABS,
} from "./constants";
import type { AccountSection } from "./motion";

export interface Paged<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export interface MediaItem {
  mediaType?: MediaType;
  pinned: boolean;
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: number | null;
}

export interface ListCardData {
  description: string;
  id: string;
  isPrivate: boolean;
  isRanked: boolean;
  itemsCount: number;
  likesCount: number;
  previews: (string | null)[];
  reviewsCount: number;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface ReviewCardData {
  backdropPath: string | null;
  content: string;
  createdAt: string;
  id: string;
  isSpoiler: boolean;
  liked: boolean;
  likesCount: number;
  mediaType?: MediaType;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  updatedAt: string;
  year: number | null;
}

export interface ActivityDays {
  counts: number[];
  from: string;
}

export interface ActivitySummary {
  days: ActivityDays;
  month: number;
  week: number;
  year: number;
}

export interface ActivityItem {
  createdAt: string;
  id: string;
  list: { slug: string; title: string } | null;
  listOwner: string | null;
  episodes?: { count: number; episode?: number; season?: number };
  mediaType: MediaType;
  posterPath: string | null;
  rating: number | null;
  target: { displayName: string; username: string } | null;
  title: string | null;
  tmdbId: number | null;
  type: string;
}

export interface DiaryRow {
  hasReview: boolean;
  id: string;
  isRewatch: boolean;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  watchedOn: string;
  year: number | null;
}

export interface DiaryEntry {
  id: string;
  title: string;
  tmdbId: number;
  watchedOn: string;
}

export interface PersonPreview {
  avatarUrl: string | null;
  displayName: string;
  username: string;
}

export interface DiaryMonth {
  first: string | null;
  last: string | null;
  month: string;
  rows: DiaryRow[];
}

export interface ListDetail {
  description: string;
  id: string;
  isPrivate: boolean;
  isRanked: boolean;
  itemsCount: number;
  liked: boolean;
  likesCount: number;
  mediaType: MediaType;
  owner: { displayName: string; id: string; username: string };
  posterPath: string | null;
  reviewsCount: number;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface ListComment {
  author: {
    avatarUrl: string | null;
    displayName: string;
    id: string;
    username: string;
  };
  content: string;
  createdAt: string;
  id: string;
  liked: boolean;
  likesCount: number;
}

export interface AccountViewProps {
  query: SearchParams;
  username: string;
}

export interface FilterOption<T extends string = string> {
  label: string;
  value: T;
}

type MediaSort = (typeof MEDIA_SORTS)[number]["value"];

type ListItemSort = (typeof LIST_ITEM_SORTS)[number]["value"];

export interface MediaFilters {
  decade: number | null;
  genre: number | null;
  page: number;
  query: string;
  sort: MediaSort;
}

export interface ListItemFilters extends Omit<MediaFilters, "sort"> {
  sort: ListItemSort;
}

export type ListSort = (typeof LIST_SORTS)[number]["value"];

type ReviewSort = (typeof REVIEW_SORTS)[number]["value"];

type ReviewKind = (typeof REVIEW_KINDS)[number]["value"];

export interface ReviewFilters {
  kind: ReviewKind;
  page: number;
  query: string;
  sort: ReviewSort;
}

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number]["value"];

type ActivitySort = (typeof ACTIVITY_SORTS)[number]["value"];

export interface ActivityFilters {
  group: ActivityGroup;
  page: number;
  sort: ActivitySort;
}

export interface CalendarDay {
  count: number;
  date: Date;
  level: number;
}

export type ActivityReview = Omit<ReviewCardData, "createdAt">;

export type SectionCue = ComponentProps<typeof AccountSection>["cue"];

export interface ProfileStat {
  count: number;
  href: string;
  label: string;
}

export interface FilterField {
  allLabel?: string;
  key: string;
  options: readonly { label: string; value: string }[];
  defaultValue?: string;
}

export type SectionKey = (typeof SECTION_TABS)[number]["key"];

export type TileSource =
  | { kind: "likes" | "watched" | "watchlist"; mediaType?: MediaType }
  | { kind: "list"; listId: string; mediaType?: MediaType };

export type AccountData = PublicAccount;

export interface AccountBackdropHeroProps {
  image?: string | null;
}

export interface AccountHeroProps {
  account?: AccountData | null;
  followersCount?: number;
  followingCount?: number;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
}

export interface AccountLayoutProps {
  account?: AccountData | null;
  children?: ReactNode;
  followersCount?: number;
  followingCount?: number;
  isFollower?: boolean;
  isOwner?: boolean;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
  tabsSlot?: ReactNode;
}

export type ProfileClient = SupabaseClient<Database>;

export type LibraryCounts = Record<
  "diary" | "likes" | "lists" | "reviews" | "watched" | "watchlist",
  number
>;

export interface PageResult<Row> {
  count: number | null;
  data: Row[] | null;
  error: { code?: string; details?: string } | null;
}

export type MediaKind = "likes" | "watched" | "watchlist";

export interface Filterable<T> {
  contains(column: string, value: unknown): T;
  gte(column: string, value: string): T;
  ilike(column: string, pattern: string): T;
  lt(column: string, value: string): T;
}

export interface MovieRow {
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
}

export interface ListRow {
  description: string;
  id: string;
  media_type?: string;
  is_private: boolean;
  is_ranked: boolean;
  items_count: number;
  likes_count: number;
  reviews_count: number;
  slug: string;
  title: string;
  updated_at: string;
}

export interface ListPageRow {
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

export interface ListPageData {
  commentCount: number;
  comments: ListComment[];
  items: Paged<MediaItem>;
  list: ListDetail;
  ownComment: string | null;
}

export interface ReviewRow {
  backdrop_path: string | null;
  content: string;
  created_at: string;
  id: string;
  is_spoiler: boolean;
  likes_count: number;
  media_type?: string;
  poster_path: string | null;
  rating: number | null;
  release_date: string | null;
  title: string | null;
  tmdb_id: number | null;
  updated_at: string;
}

export interface ActivityRow {
  created_at: string;
  id: string;
  media_type?: string | null;
  payload: Record<string, unknown> | null;
  target: { display_name: string | null; username: string } | null;
  tmdb_id: number | null;
  type: string;
}

export interface OverviewRow {
  activity: ActivityRow[];
  activity_days: { counts: number[] | null; from: string } | null;
  diary: { id: string; title: string; tmdb_id: number; watched_on: string }[];
  favorites: MovieRow[];
  following: {
    avatar_url: string | null;
    display_name: string | null;
    username: string;
  }[];
  lists: (ListRow & { previews: (string | null)[] })[];
  popular_reviews: (ReviewRow & { liked: boolean })[];
  rating_spread: number[] | null;
  recent_reviews: (ReviewRow & { liked: boolean })[];
  stats: {
    diary_count: number;
    following_count: number;
    likes_count: number;
    lists_count: number;
    reviews_count: number;
    watched_count: number;
    watchlist_count: number;
  } | null;
  watched: MovieRow[];
  watchlist: MovieRow[];
}

export interface AccountOverviewData {
  activity: ActivityItem[];
  activityDays: ActivityDays;
  counts: LibraryCounts;
  diary: DiaryEntry[];
  favorites: MediaItem[];
  following: PersonPreview[];
  followingCount: number;
  lists: ListCardData[];
  popular: ReviewCardData[];
  reviews: ReviewCardData[];
  spread: number[];
  watched: MediaItem[];
  watchlist: MediaItem[];
}

export interface DiaryEntryRow {
  id: string;
  is_rewatch: boolean;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
  watched_on: string;
}

export interface AccountPageContext {
  account: PublicAccount;
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  isOwner: boolean;
  locked: boolean;
  viewerId: string | null;
}

export interface AccountHeader {
  followersCount: number;
  followingCount: number;
  followStatus: string | null;
  library: {
    lists: number;
    reviews: number;
    shows: number;
    thisYear: number;
    watched: number;
  } | null;
  mutual: MutualFollowers | null;
}

export interface HeaderRow {
  follow_status: string | null;
  followers_count: number;
  following_count: number;
  library: {
    lists: number;
    reviews: number;
    shows?: number;
    this_year: number;
    watched: number;
  } | null;
  mutual: {
    people: {
      account_id: string;
      avatar_url: string | null;
      display_name: string | null;
      username: string;
    }[];
    total: number;
  } | null;
}

interface AccountDockCard {
  description: string | null;
  icon: string;
  title: string;
}

export type AccountDockConfig = Partial<AccountDockCard> & {
  action?: ReactNode;
};

export interface AccountDockEntry {
  dock: AccountDockConfig | null;
  path: string;
}

export interface AccountDockSlots {
  setPageDock: Dispatch<SetStateAction<AccountDockEntry | null>>;
}

export interface AccountShellProps {
  account: AccountData;
  children: ReactNode;
  followersCount: number;
  followingCount: number;
  initialFollowStatus: string | null;
  isFollower: boolean;
  isOwner: boolean;
  palette?: AmbientPalette | null;
  proofSlot?: ReactNode;
  statsSlot?: ReactNode;
}

export type AccountSkeletonSection =
  "activity" | "diary" | "list" | "lists" | "media" | "overview" | "reviews";

type Lines = readonly string[];

export interface Copy {
  phone?: Lines;
  widths: Lines;
}
