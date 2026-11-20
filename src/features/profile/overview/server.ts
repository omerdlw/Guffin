import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { FAVORITES_MAX } from "@/features/account/account";
import type { Session } from "@/lib/db/client";
import {
  accountFavorites,
  accountLikes,
  accountWatched,
  accountWatchlist,
  reviews,
} from "@/lib/db/schema";
import { getAmbientPalette } from "@/lib/tmdb/server";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { getListsPage } from "../lists/server";
import type { ProfileList } from "../lists/lists";
import { getReviewSummary, getReviewsPage } from "../reviews/server";
import type { ProfileReview, ReviewSummary } from "../reviews/reviews";

const RECENT = 4;
const WATCHLIST = 5;
const REVIEWS = 3;
const LISTS = 3;

export interface OverviewTitle {
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  year: string | null;
}

export interface RecentTitle extends OverviewTitle {
  hasReview: boolean;
  liked: boolean;
  tint: string | null;
}

export interface ProfileOverview {
  favorites: OverviewTitle[];
  lists: ProfileList[];
  recent: RecentTitle[];
  reviews: ProfileReview[];
  summary: ReviewSummary;
  watchlist: OverviewTitle[];
}

const year = (date: string | null) => date?.slice(0, 4) ?? null;

const scoreOf = (accountId: string) => eq(reviews.accountId, accountId);

function recentTitles(session: Session, accountId: string) {
  return session.db
    .select({
      hasReview: sql<boolean>`coalesce(${reviews.content} <> '', false)`,
      liked: sql<boolean>`${accountLikes.tmdbId} is not null`,
      posterPath: accountWatched.posterPath,
      rating: reviews.rating,
      releaseDate: accountWatched.releaseDate,
      title: accountWatched.title,
      tmdbId: accountWatched.tmdbId,
    })
    .from(accountWatched)
    .leftJoin(
      reviews,
      and(scoreOf(accountId), eq(reviews.tmdbId, accountWatched.tmdbId)),
    )
    .leftJoin(
      accountLikes,
      and(
        eq(accountLikes.accountId, accountId),
        eq(accountLikes.tmdbId, accountWatched.tmdbId),
      ),
    )
    .where(eq(accountWatched.accountId, accountId))
    .orderBy(desc(accountWatched.lastWatchedAt), desc(accountWatched.tmdbId))
    .limit(RECENT);
}

const toTitle = (row: {
  posterPath: string | null;
  rating: string | number | null;
  releaseDate: string | null;
  title: string;
  tmdbId: number;
}): OverviewTitle => ({
  posterPath: row.posterPath,
  rating: row.rating === null ? null : Number(row.rating),
  title: row.title,
  tmdbId: row.tmdbId,
  year: year(row.releaseDate),
});

export async function getProfileOverview({
  accountId,
  session,
  viewerId,
}: {
  accountId: string;
  session: Session;
  viewerId: string | null;
}): Promise<ProfileOverview> {
  const [favorites, recent, watchlist, written, summary, lists] =
    await Promise.all([
      session.db
        .select({
          posterPath: accountLikes.posterPath,
          rating: reviews.rating,
          releaseDate: accountLikes.releaseDate,
          title: accountLikes.title,
          tmdbId: accountLikes.tmdbId,
        })
        .from(accountFavorites)
        .innerJoin(
          accountLikes,
          and(
            eq(accountLikes.accountId, accountFavorites.accountId),
            eq(accountLikes.tmdbId, accountFavorites.tmdbId),
          ),
        )
        .leftJoin(
          reviews,
          and(scoreOf(accountId), eq(reviews.tmdbId, accountFavorites.tmdbId)),
        )
        .where(eq(accountFavorites.accountId, accountId))
        .orderBy(asc(accountFavorites.position))
        .limit(FAVORITES_MAX),
      recentTitles(session, accountId),
      session.db
        .select({
          posterPath: accountWatchlist.posterPath,
          rating: sql<null>`null`,
          releaseDate: accountWatchlist.releaseDate,
          title: accountWatchlist.title,
          tmdbId: accountWatchlist.tmdbId,
        })
        .from(accountWatchlist)
        .where(eq(accountWatchlist.accountId, accountId))
        .orderBy(
          desc(accountWatchlist.createdAt),
          desc(accountWatchlist.tmdbId),
        )
        .limit(WATCHLIST),
      getReviewsPage({
        accountId,
        kind: "written",
        session,
        sort: "newest",
        viewerId,
      }),
      getReviewSummary({ accountId, session }),
      getListsPage({ accountId, session, sort: "updated" }),
    ]);

  const tints = await Promise.all(
    recent.map(async (row) => {
      const palette = await getAmbientPalette(
        tmdbImageUrl("poster", row.posterPath, "w185"),
      );
      return palette?.regions.bottom.color ?? null;
    }),
  );

  return {
    favorites: favorites.map(toTitle),
    lists: lists.items.slice(0, LISTS),
    recent: recent.map((row, index) => ({
      ...toTitle(row),
      hasReview: Boolean(row.hasReview),
      liked: Boolean(row.liked),
      tint: tints[index] ?? null,
    })),
    reviews: written.items.slice(0, REVIEWS),
    summary,
    watchlist: watchlist.map(toTitle),
  };
}
