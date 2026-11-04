import type { Result } from "@omerdlw/base-framework/result";
import type { TmdbError } from "@/lib/tmdb/api";
import {
  type FeaturedMovie,
  type FeaturedMoviePage,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { headlineClass } from "@/ui/tokens";
import {
  COMPACT_NUMBER_FORMAT,
  LOGLINE_LENGTH,
  MEMBER_LIMIT,
  RELATIVE_TIME_FORMAT,
  RELATIVE_TIME_STEPS,
  RELEASE_DATE_FORMAT,
} from "./constants";
import type {
  CircleRow,
  Feature,
  FilmRow,
  HomeFilm,
  HomeMember,
  Member,
  MemberRow,
  PulseRow,
} from "./types";

export const compact = (value: number) => COMPACT_NUMBER_FORMAT.format(value);

export const whole = (value: number) => value.toLocaleString("en-US");

export const releaseDay = (iso: string) =>
  RELEASE_DATE_FORMAT.format(new Date(`${iso}T12:00:00Z`));

export function ago(iso: string, now = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 60_000;
  for (const [unit, next] of RELATIVE_TIME_STEPS) {
    if (Math.abs(value) < next)
      return RELATIVE_TIME_FORMAT.format(Math.round(value), unit);
    value /= next;
  }
  return RELATIVE_TIME_FORMAT.format(Math.round(value), "year");
}

export function fuse<T>(
  lists: readonly (readonly T[])[],
  key: (item: T) => number,
  k = 60,
): { item: T; score: number }[] {
  const scores = new Map<number, { item: T; score: number }>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const id = key(item);
      const entry = scores.get(id) ?? { item, score: 0 };
      entry.score += 1 / (k + rank + 1);
      scores.set(id, entry);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}

export function fresh<T extends { id: number }>(
  items: readonly T[],
  shown: Set<number>,
  limit: number,
): T[] {
  const kept = items.filter((item) => !shown.has(item.id)).slice(0, limit);
  kept.forEach((item) => shown.add(item.id));
  return kept;
}

const yearOf = (date: string | null | undefined): number | null => {
  const year = Number(date?.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
};

export function loglineOf(overview: string | null | undefined): string | null {
  const flat = overview?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const sentences = flat.match(/.+?[.!?](?=\s+["“‘']?[A-Z]|$)|.+$/g) ?? [flat];
  let line = "";
  for (const sentence of sentences) {
    const next = `${line} ${sentence.trim()}`.trim();
    if (line && next.length > LOGLINE_LENGTH) break;
    line = next;
    if (line.length >= 80) break;
  }
  if (line.length <= LOGLINE_LENGTH) return line;
  return `${line.slice(0, LOGLINE_LENGTH).replace(/\s+\S*$/, "")}…`;
}

export const titleClass = (title: string) => headlineClass(title, [22, 32, 44]);

export function runtime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest ? `${rest}m` : ""}`.trim() : `${rest}m`;
}

export function reasonOf(film: Feature): string {
  const parts: string[] = [];
  if (film.social) parts.push("Popular on Guffin");
  if (film.trending) parts.push(`Trending #${film.trending} worldwide`);
  return parts.join(" · ") || "Featured";
}

export const roomOf = (backdropPath: string | null) =>
  tmdbImageUrl("backdrop", backdropPath, "w300");

export const results = (
  outcome: Result<FeaturedMoviePage, TmdbError>,
): FeaturedMovie[] => (outcome.success ? outcome.data.results : []);

export const toMember = (row: MemberRow): Member => ({
  avatarUrl: row.avatar_url,
  displayName: row.display_name || row.username,
  username: row.username,
});

export const toFilm = (row: FilmRow): HomeFilm => ({
  backdropPath: row.backdrop_path ?? null,
  id: row.tmdb_id,
  posterPath: row.poster_path,
  title: row.title,
  year: yearOf(row.release_date),
});

export const fromTmdb = (movie: FeaturedMovie): HomeFilm => ({
  backdropPath: movie.backdropPath,
  id: movie.id,
  posterPath: movie.posterPath,
  title: movie.title,
  year: movie.releaseYear,
});

export const isoDate = (time: number) =>
  new Date(time).toISOString().slice(0, 10);

export function distinct(movies: readonly FeaturedMovie[]): FeaturedMovie[] {
  const seen = new Set<number>();
  return movies.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

export function membersOf(
  pulse: PulseRow,
  circle: CircleRow | null,
): HomeMember[] {
  const self = circle?.viewer.username ?? null;
  const suggested: HomeMember[] = (circle?.suggested ?? []).map((row) => ({
    ...toMember(row),
    bio: row.bio,
    followers: row.followers,
    id: row.id,
    reason: `Followed by ${row.mutual} you follow`,
    reviews: row.reviews,
    watched: row.watched,
  }));
  const followed = new Set(circle?.followed ?? []);
  const reviewers: HomeMember[] = pulse.reviewers
    .filter((row) => row.username !== self && !followed.has(row.id))
    .map((row) => ({
      ...toMember(row),
      bio: row.bio,
      followers: row.followers,
      id: row.id,
      reason: `${row.likes.toLocaleString("en-US")} likes on reviews this month`,
      reviews: row.reviews,
      watched: row.watched,
    }));
  const taken = new Set(suggested.map((member) => member.id));
  return [
    ...suggested,
    ...reviewers.filter((member) => !taken.has(member.id)),
  ].slice(0, MEMBER_LIMIT);
}

export const skeletonWidth = (text: string) => `${(text.length * 8.2) / 16}rem`;

export const memberFaces = (members: Member[]) =>
  members.map((member) => ({ ...member, id: member.username }));
