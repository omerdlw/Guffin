import "server-only";

import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import type { Session } from "@/infrastructure/db/client";
import { accountDiary, reviews } from "@/infrastructure/db/schema";
import { type DiaryMonth, shiftMonth } from "./model";

const MONTH_LIMIT = 400;

export async function getDiaryMonth({
  accountId,
  month,
  session,
}: {
  accountId: string;
  month: string | null;
  session: Session;
}): Promise<DiaryMonth> {
  const mine = eq(accountDiary.accountId, accountId);
  const edge = async (ascending: boolean) => {
    const [row] = await session.db
      .select({ watchedOn: accountDiary.watchedOn })
      .from(accountDiary)
      .where(mine)
      .orderBy(
        ascending ? asc(accountDiary.watchedOn) : desc(accountDiary.watchedOn),
      )
      .limit(1);
    return row?.watchedOn.slice(0, 7) ?? null;
  };
  const [first, last] = await Promise.all([edge(true), edge(false)]);
  const target = month ?? last ?? new Date().toISOString().slice(0, 7);

  const rows = await session.db
    .select({
      id: accountDiary.id,
      isRewatch: accountDiary.isRewatch,
      posterPath: accountDiary.posterPath,
      releaseDate: accountDiary.releaseDate,
      title: accountDiary.title,
      tmdbId: accountDiary.tmdbId,
      watchedOn: accountDiary.watchedOn,
    })
    .from(accountDiary)
    .where(
      and(
        mine,
        gte(accountDiary.watchedOn, `${target}-01`),
        lt(accountDiary.watchedOn, `${shiftMonth(target, 1)}-01`),
      ),
    )
    .orderBy(desc(accountDiary.watchedOn), desc(accountDiary.watchedAt))
    .limit(MONTH_LIMIT);

  const reviewed =
    rows.length > 0
      ? await session.db
          .select({
            content: reviews.content,
            rating: reviews.rating,
            tmdbId: reviews.tmdbId,
          })
          .from(reviews)
          .where(
            and(
              eq(reviews.accountId, accountId),
              inArray(reviews.tmdbId, [...new Set(rows.map((r) => r.tmdbId))]),
            ),
          )
      : [];
  const byTitle = new Map(
    reviewed.flatMap((review) =>
      review.tmdbId === null ? [] : [[review.tmdbId, review] as const],
    ),
  );

  return {
    entries: rows.map((row) => {
      const review = byTitle.get(row.tmdbId);
      return {
        hasReview: Boolean(review?.content?.trim()),
        id: row.id,
        isRewatch: row.isRewatch,
        posterPath: row.posterPath,
        rating:
          review?.rating === null || review?.rating === undefined
            ? null
            : Number(review.rating),
        title: row.title,
        tmdbId: row.tmdbId,
        watchedOn: row.watchedOn,
        year: row.releaseDate?.slice(0, 4) ?? null,
      };
    }),
    first,
    last,
    month: target,
  };
}
