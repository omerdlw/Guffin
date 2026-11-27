import { readParam, type SearchParams } from "@/shared/http";

export const DIARY_PARAM = "month";

export interface DiaryEntry {
  hasReview: boolean;
  id: string;
  isRewatch: boolean;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  watchedOn: string;
  year: string | null;
}

export interface DiaryMonth {
  entries: DiaryEntry[];
  first: string | null;
  last: string | null;
  month: string;
}

export function readDiaryMonth(query: SearchParams): string | null {
  const value = readParam(query, DIARY_PARAM);
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? value : null;
}

export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, index - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}
