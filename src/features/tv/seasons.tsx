import type { JSX } from "react";
import { Heading } from "@/features/detail/layout";
import { DetailSection } from "@/features/detail/motion";
import { seasonHref } from "@/lib/project";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { cn } from "@/design/foundations/cn";
import { RADIUS } from "@/design/foundations/geometry";
import { CAROUSEL_WIDE_ITEM } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import type { SeasonSummary } from "./types";
import { formatEpisodeCode } from "./utils";

/** Where the viewer stands across the whole show, for the shelf's header. */
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

function ShelfReadout({
  progress,
  showId,
}: {
  progress: ShelfProgress;
  showId: number;
}): JSX.Element {
  const next = progress.next;
  const code = next ? formatEpisodeCode(next.season, next.episode) : null;
  return (
    <span className="flex items-center gap-4">
      <span
        className={`hidden ${TONE.label} text-ink-muted tabular-nums sm:inline`}
      >
        {progress.watched} / {progress.aired}
      </span>
      {next && code ? (
        <DockLink
          className={`flex items-center gap-1.5 ${TONE.link}`}
          href={seasonHref(showId, next.season)}
        >
          Next {code}
          <Icon icon="solar:alt-arrow-right-linear" size={14} />
        </DockLink>
      ) : null}
    </span>
  );
}

/**
 * The show's seasons as a shelf of posters: a progress line under each one
 * the viewer started, specials last, the season being read marked.
 */
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
  /** The show's backdrop, for a season without a still of its own. */
  backdropFallback: string | null;
  current?: number | null;
  /** Plays as the opening's continuation: set when it leads the column. */
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
            <ShelfReadout progress={progress} showId={showId} />
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
