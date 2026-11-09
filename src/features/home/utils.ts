import type { Result } from "@omerdlw/base-framework/result";
import { filterEligible } from "@/features/catalog/utils";
import type { TmdbError } from "@/lib/tmdb/transport";
import {
  type FeaturedMovie,
  type FeaturedMoviePage,
  type MovieDetails,
  type ShowPage,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { toLogline } from "@/lib/format";
import { headlineClass } from "@/design/foundations/layout";
import {
  COMPACT_NUMBER_FORMAT,
  FEATURE_GENRE_LIMIT,
  FEATURE_LIMIT,
  FEATURE_SPARE_CANDIDATES,
  LOGLINE_ENOUGH_LENGTH,
  LOGLINE_LENGTH,
  MEMBER_LIMIT,
  REVIEW_LIMIT,
  INDEX_LIMIT,
  RISING_LIMIT,
  ROW_LIMIT,
  SHOWING_LIMIT,
  RELATIVE_TIME_FORMAT,
  RELATIVE_TIME_STEPS,
  RELEASE_DATE_FORMAT,
} from "./constants";
import type {
  CircleRow,
  Feature,
  FeatureCandidate,
  FilmRow,
  HomeFilm,
  HomeMember,
  Member,
  MemberRow,
  PulseRow,
  PulseShelves,
} from "./types";

export const formatCompact = (value: number) =>
  COMPACT_NUMBER_FORMAT.format(value);

export const formatWhole = (value: number) => value.toLocaleString("en-US");

export const formatReleaseDay = (iso: string) =>
  RELEASE_DATE_FORMAT.format(new Date(`${iso}T12:00:00Z`));

export function formatRelativeTime(iso: string, now = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 60_000;
  for (const [unit, next] of RELATIVE_TIME_STEPS) {
    if (Math.abs(value) < next)
      return RELATIVE_TIME_FORMAT.format(Math.round(value), unit);
    value /= next;
  }
  return RELATIVE_TIME_FORMAT.format(Math.round(value), "year");
}

export function fuseRankings<T>(
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

function takeUnseen<T extends { id: number }>(
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

const featureLogline = (overview: string | null | undefined) =>
  toLogline(overview, LOGLINE_LENGTH, LOGLINE_ENOUGH_LENGTH);

export const featureTitleClass = (title: string) =>
  headlineClass(title, [22, 32, 44]);

export function featureReason(film: Feature): string {
  const parts: string[] = [];
  if (film.social) parts.push("Popular on Guffin");
  if (film.trending) parts.push(`Trending #${film.trending} worldwide`);
  return parts.join(" · ") || "Featured";
}

export const ambientImage = (backdropPath: string | null) =>
  tmdbImageUrl("backdrop", backdropPath, "w300");

export const resultsOf = (
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

/** Eligible shows for a home shelf, as poster cards. */
export const toShowShelf = (
  outcome: Result<ShowPage, TmdbError>,
  limit: number,
): HomeFilm[] =>
  outcome.success
    ? filterEligible(outcome.data.results, "tv")
        .slice(0, limit)
        .map((show) => ({
          backdropPath: show.backdropPath,
          id: show.id,
          posterPath: show.posterPath,
          title: show.title,
          year: show.releaseYear,
        }))
    : [];

export const toIsoDate = (time: number) =>
  new Date(time).toISOString().slice(0, 10);

export function uniqueMovies(
  movies: readonly FeaturedMovie[],
): FeaturedMovie[] {
  const seen = new Set<number>();
  return movies.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

export function selectMembers(
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

export const toAvatarPeople = (members: Member[]) =>
  members.map((member) => ({ ...member, id: member.username }));

export function pickShowing(
  {
    playing,
    upcoming,
  }: { playing: FeaturedMovie[]; upcoming: FeaturedMovie[] },
  minVotes: number,
  today: string,
): { soon: FeaturedMovie[]; theatres: FeaturedMovie[] } {
  const byPopularity = (a: FeaturedMovie, b: FeaturedMovie) =>
    b.popularity - a.popularity;
  const releasedBy = (movie: FeaturedMovie) => movie.releaseDate ?? "";

  const theatres = uniqueMovies(playing)
    .filter(
      (movie) =>
        movie.posterPath &&
        movie.voteCount >= minVotes &&
        releasedBy(movie) <= today,
    )
    .sort(byPopularity)
    .slice(0, SHOWING_LIMIT);
  const soon = uniqueMovies(upcoming)
    .filter((movie) => movie.posterPath && releasedBy(movie) > today)
    .sort(byPopularity)
    .slice(0, SHOWING_LIMIT)
    .sort((a, b) => releasedBy(a).localeCompare(releasedBy(b)));

  return { soon, theatres };
}

export function mergeFeatureCandidates(
  trending: readonly FeaturedMovie[],
  popular: PulseRow["popular"],
): FeatureCandidate[] {
  const world: FeatureCandidate[] = trending.map((movie, rank) => ({
    backdropPath: movie.backdropPath,
    id: movie.id,
    social: null,
    trending: rank + 1,
  }));
  const members: FeatureCandidate[] = popular.map((film) => ({
    backdropPath: film.backdrop_path ?? null,
    id: film.tmdb_id,
    social: film,
    trending: null,
  }));
  const find = (list: FeatureCandidate[], id: number) =>
    list.find((candidate) => candidate.id === id);

  return fuseRankings([world, members], (candidate) => candidate.id)
    .map(({ item }) => ({
      ...item,
      social: item.social ?? find(members, item.id)?.social ?? null,
      trending: item.trending ?? find(world, item.id)?.trending ?? null,
    }))
    .filter((candidate) => candidate.backdropPath)
    .slice(0, FEATURE_LIMIT + FEATURE_SPARE_CANDIDATES);
}

export function toFeature(
  candidate: FeatureCandidate,
  movie: MovieDetails,
): Feature | null {
  const backdropPath = movie.backdropPath ?? candidate.backdropPath;
  if (!backdropPath) return null;
  const { social } = candidate;
  return {
    backdropPath,
    genres: movie.genres.slice(0, FEATURE_GENRE_LIMIT).map(({ name }) => name),
    id: movie.id,
    logline: featureLogline(movie.overview),
    posterPath: movie.posterPath,
    runtime: movie.runtimeMinutes,
    social: social
      ? {
          faces: social.faces.map(toMember),
          rating: social.rating,
          watchers: social.members,
        }
      : null,
    title: movie.title,
    trending: candidate.trending,
    year: movie.releaseYear,
  };
}

export function toPulseShelves(pulse: PulseRow): PulseShelves {
  const shown = new Set<number>();
  const popular = takeUnseen(
    pulse.popular
      .filter((row) => row.poster_path)
      .map((row) => ({
        ...toFilm(row),
        faces: row.faces.map(toMember),
        members: row.members,
        rating: row.rating,
        watchers: row.watchers,
      })),
    shown,
    INDEX_LIMIT,
  );
  const rising = takeUnseen(
    pulse.rising
      .filter((row) => row.lift >= 1)
      .map((row) => ({
        ...toFilm(row),
        lift: row.lift,
        week: row.week,
      })),
    shown,
    RISING_LIMIT,
  );

  return {
    lists: pulse.lists.map((row) => ({
      description: row.description,
      films: row.items_count,
      id: row.id,
      likes: row.likes_count,
      owner: toMember(row.owner),
      previews: row.previews,
      slug: row.slug,
      title: row.title,
    })),
    popular,
    rated: pulse.top_rated
      .filter((row) => row.poster_path)
      .slice(0, ROW_LIMIT)
      .map((row) => ({
        ...toFilm(row),
        rating: row.rating,
        ratings: row.ratings,
      })),
    reviews: pulse.reviews.slice(0, REVIEW_LIMIT).map((row) => ({
      author: toMember(row.author),
      content: row.content,
      createdAt: row.created_at,
      film: toFilm(row),
      id: row.id,
      likes: row.likes_count,
      rating: row.rating,
    })),
    rising,
  };
}
