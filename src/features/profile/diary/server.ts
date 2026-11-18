import "server-only";

import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import {
  type DiaryRow,
  type ProfileClient,
  releaseYear,
  shiftMonth,
} from "@/features/profile/profile";
import { accountDiary, reviews } from "@/lib/db/schema";
import type { MediaType } from "@/lib/tmdb/shared";

interface DiaryMonth {
  first: string | null;
  last: string | null;
  month: string;
  rows: DiaryRow[];
}

interface DiaryEntryRow {
  id: string;
  is_rewatch: boolean;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
  watched_on: string;
}

const DIARY_MONTH_LIMIT = 400;

function monthBounds(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
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
  const mine = and(
    eq(accountDiary.accountId, accountId),
    eq(accountDiary.mediaType, mediaType),
  );
  const edge = async (ascending: boolean) => {
    const [row] = await client.db
      .select({ watchedOn: accountDiary.watchedOn })
      .from(accountDiary)
      .where(mine)
      .orderBy(
        ascending ? asc(accountDiary.watchedOn) : desc(accountDiary.watchedOn),
      )
      .limit(1);
    return row?.watchedOn.slice(0, 7) ?? null;
  };

  const [firstMonth, lastMonth] = await Promise.all([edge(true), edge(false)]);
  const target = month ?? lastMonth ?? new Date().toISOString().slice(0, 7);

  const { from, to } = monthBounds(target);
  const entries: DiaryEntryRow[] = await client.db
    .select({
      id: accountDiary.id,
      is_rewatch: accountDiary.isRewatch,
      poster_path: accountDiary.posterPath,
      release_date: accountDiary.releaseDate,
      title: accountDiary.title,
      tmdb_id: accountDiary.tmdbId,
      watched_on: accountDiary.watchedOn,
    })
    .from(accountDiary)
    .where(
      and(
        mine,
        gte(accountDiary.watchedOn, from),
        lt(accountDiary.watchedOn, to),
      ),
    )
    .orderBy(desc(accountDiary.watchedOn), desc(accountDiary.watchedAt))
    .limit(DIARY_MONTH_LIMIT);

  const reviewed =
    entries.length > 0
      ? await client.db
          .select({
            content: reviews.content,
            rating: reviews.rating,
            tmdb_id: reviews.tmdbId,
          })
          .from(reviews)
          .where(
            and(
              eq(reviews.accountId, accountId),
              eq(reviews.mediaType, mediaType),
              inArray(reviews.tmdbId, [
                ...new Set(entries.map((entry) => entry.tmdb_id)),
              ]),
            ),
          )
      : [];
  const byMovie = new Map(
    reviewed.flatMap((review) =>
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
        mediaType,
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
