import type { JSX } from "react";
import { cn } from "@/ui/cn";
import { movieHref } from "@/config/routes";
import { MediaCard, RADIUS } from "@/ui";
import type { MediaItem } from "../browse-types";
import { GRID, posterImage } from "../poster";
import { AccountPart } from "../motion";
import { TileActions, type TileSource } from "./tile-actions";

export function PosterTile({
  index = 0,
  item,
  rank,
  source,
  staged = false,
}: {
  index?: number;
  item: MediaItem;
  rank?: number;
  source?: TileSource | null;
  // Played by the page's own score: each poster comes up through its own door.
  staged?: boolean;
}) {
  const label = item.year ? `${item.title} (${item.year})` : item.title;
  const body = (
    <>
      <MediaCard
        fallbackIcon="solar:clapperboard-play-bold"
        href={movieHref(item.tmdbId)}
        image={posterImage(item.posterPath)}
        label={label}
        radius={RADIUS.card}
        tooltip={item.pinned ? `${label} · Favorite` : label}
      />
      {rank !== undefined ? (
        <span className="pointer-events-none absolute top-2 left-2 center h-6 min-w-6 rounded-thumb bg-black/70 px-1.5 type-label font-semibold text-ink tabular-nums ring-1 ring-edge-hover backdrop-blur-sm">
          {rank}
        </span>
      ) : null}
      {source ? (
        <TileActions
          pinned={item.pinned}
          source={source}
          title={item.title}
          tmdbId={item.tmdbId}
        />
      ) : null}
    </>
  );
  const className = "group/tile relative min-w-0";
  return staged ? (
    <AccountPart as="li" className={className} index={index} name="tile">
      {body}
    </AccountPart>
  ) : (
    <li className={className}>{body}</li>
  );
}

export function PosterGrid({
  className,
  items,
  numberFrom,
  source,
  staged = false,
}: {
  className?: string;
  items: readonly MediaItem[];
  numberFrom?: number;
  source?: TileSource | null;
  staged?: boolean;
}): JSX.Element {
  return (
    <ul className={cn(GRID, className)}>
      {items.map((item, index) => (
        <PosterTile
          index={index}
          item={item}
          key={item.tmdbId}
          staged={staged}
          rank={numberFrom !== undefined ? numberFrom + index : undefined}
          source={source}
        />
      ))}
    </ul>
  );
}
