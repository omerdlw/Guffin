import type { Database } from "@/lib/supabase/database.types";
import type { SeasonSummary } from "@/lib/tmdb/shared";

export type ShowStatus = (typeof SHOW_STATUSES)[number];

export interface ShowProgress {
  airedEpisodes: number | null;
  lastEpisode: number | null;
  lastSeason: number | null;
  lastWatchedAt: string | null;
  status: ShowStatus;
  watchedEpisodes: number;
}

type WatchedEpisodeKeys = string[];

export interface EpisodeRatingMark {
  episode: number;
  rating: number;
  season: number;
}

export interface ShowTracking {
  progress: ShowProgress | null;
  ratings: EpisodeRatingMark[];
  watched: WatchedEpisodeKeys;
}

export interface ContinueItem {
  airedEpisodes: number | null;
  lastEpisode: number | null;
  lastSeason: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  showId: number;
  status: ShowStatus;
  title: string;
  watchedEpisodes: number;
}

const SHOW_STATUSES = ["watching", "completed", "paused", "dropped"] as const;

export const SHOW_STATUS_LABELS = Object.freeze({
  watching: "Watching",
  completed: "Finished",
  paused: "Paused",
  dropped: "Dropped",
} as const);

export const SHOW_STATUS_ICONS = Object.freeze({
  watching: "solar:play-circle-bold",
  completed: "solar:check-circle-bold",
  paused: "solar:pause-circle-bold",
  dropped: "solar:close-circle-bold",
} as const);

export const SHOW_EVENTS = Object.freeze({ CHANGE: "tv:change" });

const SPECIALS_SEASON = 0;

const EPISODE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

type ProgressRow = Database["public"]["Tables"]["account_show_progress"]["Row"];

export function isShowStatus(value: unknown): value is ShowStatus {
  return (SHOW_STATUSES as readonly unknown[]).includes(value);
}

export const episodeKey = (season: number, episode: number) =>
  `${season}:${episode}`;

export function isAired(
  airDate: string | null,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  return Boolean(airDate && airDate <= today);
}

export function splitSeasons(seasons: readonly SeasonSummary[]): {
  regular: SeasonSummary[];
  specials: SeasonSummary | null;
} {
  return {
    regular: seasons
      .filter((season) => season.seasonNumber !== SPECIALS_SEASON)
      .sort((a, b) => a.seasonNumber - b.seasonNumber),
    specials:
      seasons.find((season) => season.seasonNumber === SPECIALS_SEASON) ?? null,
  };
}

export function toShowProgress(row: ProgressRow | null): ShowProgress | null {
  if (!row || !isShowStatus(row.status)) return null;
  return {
    airedEpisodes: row.aired_episodes,
    lastEpisode: row.last_episode,
    lastSeason: row.last_season,
    lastWatchedAt: row.last_watched_at,
    status: row.status,
    watchedEpisodes: row.watched_episodes,
  };
}

export function formatEpisodeCode(
  season: number | null,
  episode: number | null,
): string | null {
  if (season === null || episode === null) return null;
  return `S${season} · E${episode}`;
}

export function progressRatio(
  watched: number,
  aired: number | null | undefined,
): number {
  if (!aired || aired <= 0) return 0;
  return Math.max(0, Math.min(1, watched / aired));
}

export function formatShowYears(
  start: number | null,
  end: number | null,
  airing: boolean,
): string | null {
  if (!start) return null;
  if (airing) return `${start}–`;
  if (!end || end === start) return String(start);
  return `${start}–${end}`;
}

export function parseShowId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

export function parseSeasonNumber(raw: string): number | null {
  return /^(0|[1-9]\d{0,2})$/.test(raw) ? Number(raw) : null;
}

export function formatEpisodeDate(date: string | null): string | null {
  return date
    ? EPISODE_DATE_FORMAT.format(new Date(`${date}T00:00:00Z`))
    : null;
}

export function daysUntil(
  date: string | null,
  today: string = new Date().toISOString().slice(0, 10),
): number | null {
  if (!date || date < today) return null;
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
}
