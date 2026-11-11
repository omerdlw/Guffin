import type { Database } from "@/lib/supabase/database.types";
import type { PersonEntry } from "@/features/movie/types";
import {
  EPISODE_DATE_FORMAT,
  SHOW_CERTIFICATION_REGION,
  SHOW_CREW_JOBS,
  SHOW_RECOMMENDATION_LIMIT,
  SHOW_STATUSES,
  SHOW_STATUS_TEXT,
  SPECIALS_SEASON,
  TRACKING_ERRORS,
} from "./constants";
import type {
  AiredEpisode,
  Episode,
  SeasonSummary,
  ShowDetails,
  ShowProgress,
  ShowStatus,
} from "./types";

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

export function toAiredEpisodes(
  episodes: readonly Episode[],
  today?: string,
): AiredEpisode[] {
  return episodes
    .filter((episode) => isAired(episode.airDate, today))
    .map((episode) => ({
      s: episode.seasonNumber,
      e: episode.episodeNumber,
      r: episode.runtimeMinutes,
    }));
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

export function trackingErrorMessage(
  message: string | undefined,
): string | null {
  if (!message) return null;
  const code = Object.keys(TRACKING_ERRORS).find((key) =>
    message.includes(key),
  );
  return code ? TRACKING_ERRORS[code] : null;
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

export function showStatusText(status: string): string | null {
  return SHOW_STATUS_TEXT[status] ?? null;
}

export function getShowCertification(
  show: Pick<ShowDetails, "contentRatings">,
  region: string = SHOW_CERTIFICATION_REGION,
): string | null {
  return (
    show.contentRatings.find((rating) => rating.region === region)?.rating ??
    null
  );
}

export function describeShow(
  show: Pick<
    ShowDetails,
    | "endYear"
    | "inProduction"
    | "networks"
    | "releaseYear"
    | "seasonsCount"
    | "status"
  >,
): string {
  const airing = show.status === "Returning Series" || show.inProduction;
  return [
    formatShowYears(show.releaseYear, show.endYear, airing),
    show.seasonsCount
      ? `${show.seasonsCount} season${show.seasonsCount === 1 ? "" : "s"}`
      : null,
    show.networks[0]?.name ?? null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function getShowRecommendations(
  show: Pick<ShowDetails, "id" | "recommendations">,
  limit = SHOW_RECOMMENDATION_LIMIT,
) {
  return show.recommendations
    .filter((item) => item.id !== show.id && item.posterPath)
    .slice(0, limit);
}

export function toShowPersonEntries(show: Pick<ShowDetails, "credits">): {
  cast: PersonEntry[];
  crew: PersonEntry[];
} {
  const rank = (job: string | null) => {
    const index = job ? (SHOW_CREW_JOBS as readonly string[]).indexOf(job) : -1;
    return index === -1 ? SHOW_CREW_JOBS.length : index;
  };
  const episodes = (count: number) =>
    count > 0 ? `${count} episode${count === 1 ? "" : "s"}` : null;

  return {
    cast: [...show.credits.cast]
      .sort((a, b) => a.order - b.order || b.episodeCount - a.episodeCount)
      .map((member) => ({
        id: member.id,
        key: member.creditId,
        name: member.name,
        profilePath: member.profilePath,
        subtitle:
          [member.character, episodes(member.episodeCount)]
            .filter(Boolean)
            .join(" · ") || "Cast",
      })),
    crew: [...show.credits.crew]
      .filter((member) => member.job)
      .sort(
        (a, b) => rank(a.job) - rank(b.job) || b.episodeCount - a.episodeCount,
      )
      .map((member) => ({
        id: member.id,
        key: `${member.id}-${member.creditId}`,
        name: member.name,
        profilePath: member.profilePath,
        subtitle: [member.job, episodes(member.episodeCount)]
          .filter(Boolean)
          .join(" · "),
      })),
  };
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
