import "server-only";

import {
  type DiaryRow,
  type ProfileClient,
  releaseYear,
  shiftMonth,
} from "@/features/profile/profile";
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
