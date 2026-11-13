import type { JSX } from "react";
import { tvHref } from "@/lib/project";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";
import { MediaCard } from "@/design/components/media-card";
import { cn } from "@/design/ui";
import { RADIUS } from "@/design/foundations/geometry";
import type { ContinueItem } from "./types";
import { formatEpisodeCode, progressRatio } from "./utils";

export function ProgressBar({
  className,
  ratio,
}: {
  className?: string;
  ratio: number;
}): JSX.Element {
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(ratio * 100)}
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-line",
        className,
      )}
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-ink-body"
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  );
}

function progressCaption(show: ContinueItem): string {
  const code = formatEpisodeCode(show.lastSeason, show.lastEpisode);
  const count = show.airedEpisodes
    ? `${show.watchedEpisodes}/${show.airedEpisodes}`
    : `${show.watchedEpisodes} ep.`;
  return [code, count].filter(Boolean).join(" · ");
}

function ShowProgressCard({ show }: { show: ContinueItem }): JSX.Element {
  const caption = progressCaption(show);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <MediaCard
        fallbackIcon="solar:tv-bold"
        href={tvHref(show.showId)}
        image={{
          sizes: "(min-width: 768px) 160px, 30vw",
          src: tmdbImageUrl("poster", show.posterPath, "w342"),
          srcSet:
            tmdbImageSrcSet("poster", show.posterPath, ["w185", "w342"]) ??
            undefined,
        }}
        label={show.title}
        radius={RADIUS.card}
        tooltip={`${show.title} · ${caption}`}
      />
      <ProgressBar
        ratio={progressRatio(show.watchedEpisodes, show.airedEpisodes)}
      />
      <span className="truncate type-meta text-ink-muted tabular-nums">
        {caption}
      </span>
    </div>
  );
}

export function ShowProgressGrid({
  shows,
}: {
  shows: readonly ContinueItem[];
}): JSX.Element {
  return (
    <ul className="grid grid-cols-3 gap-x-fib-3 gap-y-fib-4 sm:grid-cols-4 lg:grid-cols-6">
      {shows.map((show) => (
        <li key={show.showId}>
          <ShowProgressCard show={show} />
        </li>
      ))}
    </ul>
  );
}
