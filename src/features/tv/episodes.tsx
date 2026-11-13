"use client";

import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useMemo,
  useState,
} from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  Button,
  HighlightGroup,
  Image,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { Unfold } from "@/design/components/surface";
import { Tooltip } from "@/design/components/tooltip";
import { nested, RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in-surface";
import { Heading } from "@/features/detail/layout";
import {
  DetailExpose,
  DetailPart,
  DetailSection,
} from "@/features/detail/motion";
import { DetailAction } from "@/features/detail/stage";
import { COLLECTION_ICONS } from "@/features/movie/constants";
import { RatingSelector, RatingStars } from "@/features/reviews/rating";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  rateEpisodeAction,
  setEpisodesWatchedAction,
  setSeasonWatchedAction,
} from "./actions";
import { announceShowChange } from "./status";
import type {
  Episode,
  EpisodeRatingMark,
  SeasonDetails,
  ShowStatus,
} from "./types";
import {
  daysUntil,
  episodeKey,
  formatEpisodeDate,
  isAired,
  progressRatio,
} from "./utils";

interface SeasonTracker {
  aired: readonly Episode[];
  allWatched: boolean;
  busy: boolean;
  rate: (episode: Episode, rating: number | null) => void;
  ratings: ReadonlyMap<number, number>;
  season: SeasonDetails;
  toggle: (episode: Episode) => void;
  toggleSeason: () => void;
  watched: ReadonlySet<string>;
  watchedCount: number;
}

const SeasonTrackerContext = createContext<SeasonTracker | null>(null);

function useSeasonTracker(): SeasonTracker {
  const tracker = use(SeasonTrackerContext);
  if (!tracker) throw new Error("Season controls need a SeasonTracker");
  return tracker;
}

type Write = () => Promise<
  | { success: true; progress?: { status: ShowStatus } | null }
  | { success: false; error: string }
>;

export function SeasonTrackerProvider({
  children,
  initialRatings,
  initialWatched,
  season,
  showId,
}: {
  children: ReactNode;
  initialRatings: readonly EpisodeRatingMark[];
  initialWatched: readonly string[];
  season: SeasonDetails;
  showId: number;
}): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const openSignIn = useOpenSignIn();
  const [watched, setWatched] = useState<ReadonlySet<string>>(
    () => new Set(initialWatched),
  );
  const [ratings, setRatings] = useState<ReadonlyMap<number, number>>(
    () =>
      new Map(
        initialRatings
          .filter((mark) => mark.season === season.seasonNumber)
          .map((mark) => [mark.episode, mark.rating]),
      ),
  );
  const [busy, setBusy] = useState(false);

  const aired = useMemo(
    () => season.episodes.filter((episode) => isAired(episode.airDate)),
    [season.episodes],
  );
  const keyOf = (episode: Episode) =>
    episodeKey(season.seasonNumber, episode.episodeNumber);
  const watchedCount = season.episodes.filter((episode) =>
    watched.has(keyOf(episode)),
  ).length;
  const allWatched = aired.length > 0 && watchedCount >= aired.length;

  const allowed = () => {
    if (!auth.isAuthenticated) {
      openSignIn();
      return false;
    }
    return !busy;
  };

  const run = async (write: Write, rollback: () => void) => {
    setBusy(true);
    try {
      const result = await write();
      if (!result.success) {
        rollback();
        toast(result.error);
        return;
      }
      announceShowChange({
        showId,
        ...(result.progress !== undefined
          ? { status: result.progress?.status ?? null }
          : {}),
      });
      router.refresh();
    } catch (error) {
      report("Season write", error);
      rollback();
      toast(
        toUserMessage(error, { fallback: "Could not update your progress" }),
      );
    } finally {
      setBusy(false);
    }
  };

  const mark = (episodes: readonly Episode[], on: boolean) =>
    setWatched((current) => {
      const next = new Set(current);
      for (const episode of episodes) {
        if (on) next.add(keyOf(episode));
        else next.delete(keyOf(episode));
      }
      return next;
    });

  const toggle = (episode: Episode) => {
    if (!allowed()) return;
    const on = !watched.has(keyOf(episode));
    const before = watched;
    mark([episode], on);
    void run(
      () =>
        setEpisodesWatchedAction(
          showId,
          season.seasonNumber,
          [episode.episodeNumber],
          on,
        ),
      () => setWatched(before),
    );
  };

  const toggleSeason = () => {
    if (!allowed() || aired.length === 0) return;
    const on = !allWatched;
    const before = watched;
    mark(on ? aired : season.episodes, on);
    void run(
      () => setSeasonWatchedAction(showId, season.seasonNumber, on),
      () => setWatched(before),
    );
  };

  const rate = (episode: Episode, rating: number | null) => {
    if (!allowed()) return;
    const beforeRatings = ratings;
    const beforeWatched = watched;
    setRatings((current) => {
      const next = new Map(current);
      if (rating === null) next.delete(episode.episodeNumber);
      else next.set(episode.episodeNumber, rating);
      return next;
    });
    if (rating !== null) mark([episode], true);
    void run(
      () =>
        rateEpisodeAction(
          showId,
          season.seasonNumber,
          episode.episodeNumber,
          rating,
        ),
      () => {
        setRatings(beforeRatings);
        setWatched(beforeWatched);
      },
    );
  };

  const value: SeasonTracker = {
    aired,
    allWatched,
    busy,
    rate,
    ratings,
    season,
    toggle,
    toggleSeason,
    watched,
    watchedCount,
  };
  return <SeasonTrackerContext value={value}>{children}</SeasonTrackerContext>;
}

export function SeasonWatchAction(): JSX.Element {
  const { aired, allWatched, busy, toggleSeason } = useSeasonTracker();
  return (
    <DetailAction
      active={allWatched}
      disabled={aired.length === 0}
      grow
      hoverLabel={allWatched ? "Unmark season" : undefined}
      icon={COLLECTION_ICONS.watched}
      label={allWatched ? "Season watched" : "Mark season"}
      loading={busy}
      onClick={toggleSeason}
    />
  );
}

export function SeasonWatchedStat(): JSX.Element | null {
  const { aired, watchedCount } = useSeasonTracker();
  if (aired.length === 0) return null;
  return (
    <DetailPart name="stat">
      <Tooltip
        position="top"
        text={`You watched ${watchedCount} of ${aired.length} aired episodes`}
      >
        <span className="flex cursor-help items-center gap-1.5 type-control leading-5 font-medium text-ink-body tabular-nums">
          <Icon
            className={watchedCount > 0 ? "text-watched" : "text-ink-muted"}
            icon={COLLECTION_ICONS.watched.on}
            size={16}
          />
          {watchedCount}/{aired.length}
        </span>
      </Tooltip>
    </DetailPart>
  );
}

function airingNote(episode: Episode): string | null {
  const date = formatEpisodeDate(episode.airDate);
  if (!date) return "Date to be announced";
  if (isAired(episode.airDate)) return date;
  const days = daysUntil(episode.airDate);
  if (days === 0) return "Airs today";
  if (days === 1) return "Airs tomorrow";
  return days !== null && days < 14 ? `Airs in ${days} days` : `Airs ${date}`;
}

const STILL_RADIUS = nested(RADIUS.panel, 8);

const EPISODE_KIND: Record<string, string> = {
  finale: "Finale",
  mid_season: "Mid-season finale",
};

function EpisodeRow({
  episode,
  index,
}: {
  episode: Episode;
  index: number;
}): JSX.Element {
  const { busy, rate, ratings, season, toggle, watched } = useSeasonTracker();
  const [rating, setRating] = useState(false);
  const key = episodeKey(season.seasonNumber, episode.episodeNumber);
  const highlight = useHighlight(
    key,
    "rounded-panel bg-fill-hover ring-1 ring-edge-hover ring-inset",
  );
  const seen = watched.has(key);
  const aired = isAired(episode.airDate);
  const mine = ratings.get(episode.episodeNumber) ?? null;
  const title = episode.name ?? `Episode ${episode.episodeNumber}`;
  const label = `Episode ${episode.episodeNumber}, ${title}`;
  const still = tmdbImageUrl("backdrop", episode.stillPath, "w780");
  const kind = episode.episodeType ? EPISODE_KIND[episode.episodeType] : null;
  const meta = [
    airingNote(episode),
    episode.runtimeMinutes ? `${episode.runtimeMinutes} min` : null,
  ].filter(Boolean);

  return (
    <DetailPart as="li" index={index} name="entry">
      <article
        className={cn(
          "group relative isolate flex flex-col gap-3 rounded-panel p-2",
          !aired && "opacity-70",
        )}
        {...highlight.props}
      >
        {highlight.node}
        <div className="relative z-10 flex items-start gap-4 sm:gap-5">
          <div
            className="relative aspect-video w-28 shrink-0 overflow-hidden bg-fill ring-1 ring-edge ring-inset sm:w-44"
            style={{ borderRadius: STILL_RADIUS }}
          >
            <Image
              alt=""
              className="cine-zoom size-full object-cover"
              fallback={
                <div className="center size-full text-ink-faint">
                  <Icon icon="solar:tv-bold" size={18} />
                </div>
              }
              sizes="(min-width: 640px) 176px, 112px"
              src={still}
              srcSet={
                tmdbImageSrcSet("backdrop", episode.stillPath, [
                  "w300",
                  "w780",
                ]) ?? undefined
              }
            />
            <span
              className={`pointer-events-none absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 type-micro font-semibold tracking-label text-ink tabular-nums ${TONE.glass}`}
            >
              E{episode.episodeNumber}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <h3 className="flex min-w-0 items-baseline gap-2">
              <DetailExpose
                className="truncate type-copy font-semibold text-ink sm:type-base"
                index={index}
                part="name"
                text={title}
                truncate
              />
              {kind ? (
                <span className={`shrink-0 ${TONE.label} text-grade`}>
                  {kind}
                </span>
              ) : null}
            </h3>
            <p className="flex flex-wrap items-center gap-x-2 type-meta text-ink-muted tabular-nums">
              {meta.map((item, at) => (
                <span className="flex items-center gap-2" key={item}>
                  {at > 0 ? <span aria-hidden="true">·</span> : null}
                  {item}
                </span>
              ))}
              {episode.voteCount > 0 && episode.voteAverage > 0 ? (
                <span className="flex items-center gap-1">
                  <span aria-hidden="true">·</span>
                  <Icon
                    className="text-rated"
                    icon="solar:star-bold"
                    size={11}
                  />
                  {episode.voteAverage.toFixed(1)}
                </span>
              ) : null}
            </p>
            {episode.overview ? (
              <p className="mt-1 line-clamp-2 type-body text-pretty text-ink-body max-sm:hidden">
                {episode.overview}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 self-center">
            {aired ? (
              <Button
                aria-expanded={rating}
                aria-label={mine ? `Your rating for ${label}` : `Rate ${label}`}
                className="px-3 max-sm:hidden"
                intent={rating || mine ? "chosen" : "neutral"}
                shape="pill"
                size="chrome"
                onClick={() => setRating((open) => !open)}
              >
                {mine ? (
                  <RatingStars rating={mine} size={11} />
                ) : (
                  <>
                    <Icon icon="solar:star-linear" size={14} />
                    Rate
                  </>
                )}
              </Button>
            ) : null}
            <Button
              aria-label={seen ? `Unmark ${label}` : `Mark ${label} watched`}
              aria-pressed={seen}
              icon
              intent={seen ? "chosen" : "neutral"}
              shape="pill"
              size="chrome"
              disabled={busy || (!aired && !seen)}
              onClick={() => toggle(episode)}
            >
              <Icon
                className="ui-glyph"
                icon={
                  seen
                    ? COLLECTION_ICONS.watched.on
                    : COLLECTION_ICONS.watched.off
                }
                size={16}
              />
            </Button>
          </div>
        </div>
        {rating ? (
          <Unfold>
            <div className="relative z-10 flex items-center justify-end gap-3 pr-1 pb-1">
              <span className={`${TONE.label} text-ink-muted`}>
                Your rating
              </span>
              <RatingSelector
                disabled={busy}
                onChange={(next) => {
                  setRating(false);
                  rate(episode, next);
                }}
                value={mine}
              />
            </div>
          </Unfold>
        ) : null}
      </article>
    </DetailPart>
  );
}

export function EpisodeList(): JSX.Element {
  const { aired, season, watchedCount } = useSeasonTracker();
  const count = season.episodes.length;

  return (
    <DetailSection className="flex w-full flex-col" cue="episodes" now>
      <Heading
        actions={
          aired.length > 0 ? (
            <span className={`${TONE.label} text-ink-muted tabular-nums`}>
              {watchedCount} / {aired.length} watched
            </span>
          ) : null
        }
        icon="solar:play-stream-bold"
        progress={
          aired.length > 0
            ? progressRatio(watchedCount, aired.length)
            : undefined
        }
        title={`Episodes (${count})`}
      />
      <HighlightGroup>
        <ol className="-mx-2 flex flex-col gap-1">
          {season.episodes.map((episode, index) => (
            <EpisodeRow episode={episode} index={index} key={episode.id} />
          ))}
        </ol>
      </HighlightGroup>
    </DetailSection>
  );
}
