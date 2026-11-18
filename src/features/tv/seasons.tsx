import type { JSX } from "react";
import { Image } from "@omerdlw/base-framework/ui";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { RADIUS } from "@/design/foundations/geometry";
import { CAROUSEL_WIDE_ITEM } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { Heading } from "@/features/detail/layout";
import { DetailPart, DetailSection } from "@/features/detail/motion";
import { seasonHref } from "@/lib/project";
import {
  type SeasonSummary,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { ProgressBar } from "./progress";
import { formatEpisodeCode, progressRatio } from "./show";

export interface ShelfProgress {
  aired: number;
  next: { episode: number; season: number } | null;
  watched: number;
}

function SeasonCard({
  current,
  fallback,
  season,
  showId,
  still,
  watched,
}: {
  current: boolean;
  fallback: string | null;
  season: SeasonSummary;
  showId: number;
  still: string | null;
  watched: number;
}): JSX.Element {
  const name = season.name ?? `Season ${season.seasonNumber}`;
  const picture = still ?? fallback;
  const episodes = `${season.episodeCount} episode${season.episodeCount === 1 ? "" : "s"}`;
  const meta = [
    season.year,
    episodes,
    watched > 0 ? `${watched} watched` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <MediaCard
      aspect="video"
      fallbackIcon="solar:tv-bold"
      href={seasonHref(showId, season.seasonNumber)}
      image={{
        crossOrigin: "anonymous",
        sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
        src: tmdbImageUrl("backdrop", picture, "w780"),
        srcSet:
          tmdbImageSrcSet("backdrop", picture, ["w300", "w780"]) ?? undefined,
      }}
      label={`${name}, ${meta}`}
      overlay={
        <div className="on-photo pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-page/80 to-transparent p-3 text-left">
          <h3
            className={cn(
              "truncate type-body font-semibold",
              current ? "text-grade" : "text-ink",
            )}
          >
            {name}
          </h3>
        </div>
      }
      radius={RADIUS.card}
      tooltip={`${name} · ${meta}`}
    />
  );
}

function ShelfReadout({ progress }: { progress: ShelfProgress }): JSX.Element {
  return (
    <span className={`${TONE.label} text-ink-muted tabular-nums`}>
      {progress.watched} / {progress.aired}
    </span>
  );
}

export function ShowResume({
  fallback,
  progress,
  showId,
  stills,
}: {
  fallback: string | null;
  progress: ShelfProgress | null;
  showId: number;
  stills: Readonly<Record<number, string | null>>;
}): JSX.Element | null {
  const next = progress?.next;
  const code = next ? formatEpisodeCode(next.season, next.episode) : null;
  if (!progress || !next || !code) return null;
  const picture = stills[next.season] ?? fallback;

  return (
    <DetailPart name="resume">
      <DockLink
        aria-label={`Continue with ${code}, ${progress.watched} of ${progress.aired} episodes watched`}
        className={cn(
          "flex items-center gap-3 rounded-card p-2 pr-4",
          TONE.surface,
        )}
        href={seasonHref(showId, next.season)}
      >
        <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-thumb bg-fill">
          {picture ? (
            <Image
              alt=""
              className="object-cover"
              sizes="96px"
              src={tmdbImageUrl("backdrop", picture, "w300")}
            />
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={`${TONE.label} text-ink-muted`}>Continue</span>
          <span className="flex items-baseline justify-between gap-3 type-body font-semibold text-ink tabular-nums">
            {code}
            <span className="type-meta font-medium text-ink-muted">
              {progress.watched} / {progress.aired}
            </span>
          </span>
          <ProgressBar
            className="mt-1"
            ratio={progressRatio(progress.watched, progress.aired)}
            slot="rule"
          />
        </span>
        <Icon
          className="shrink-0 text-ink-muted"
          icon="solar:alt-arrow-right-linear"
          size={16}
        />
      </DockLink>
    </DetailPart>
  );
}

export function SeasonShelf({
  backdropFallback,
  current = null,
  now = false,
  progress = null,
  seasons,
  showId,
  stills,
  title = "Seasons",
  watchedBySeason,
}: {
  backdropFallback: string | null;
  current?: number | null;
  now?: boolean;
  progress?: ShelfProgress | null;
  seasons: readonly SeasonSummary[];
  showId: number;
  stills: Readonly<Record<number, string | null>>;
  title?: string;
  watchedBySeason: Readonly<Record<number, number>>;
}): JSX.Element | null {
  if (seasons.length === 0) return null;
  return (
    <DetailSection className="flex w-full flex-col" cue="row" now={now}>
      <Heading
        actions={
          progress && progress.watched > 0 ? (
            <ShelfReadout progress={progress} />
          ) : null
        }
        icon="solar:layers-bold"
        title={title}
      />
      <Carousel
        arrowClassName={TONE.arrows}
        itemClassName={seasons.length === 1 ? "w-full" : CAROUSEL_WIDE_ITEM}
        label={title}
        part="slide"
      >
        {seasons.map((season) => (
          <SeasonCard
            current={season.seasonNumber === current}
            fallback={backdropFallback}
            key={season.id}
            season={season}
            showId={showId}
            still={stills[season.seasonNumber] ?? null}
            watched={watchedBySeason[season.seasonNumber] ?? 0}
          />
        ))}
      </Carousel>
    </DetailSection>
  );
}
