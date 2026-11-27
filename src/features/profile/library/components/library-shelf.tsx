"use client";

import { type JSX, useState, useTransition } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { useConfirmedAction } from "@/design/components/confirm";
import { Icon } from "@/design/components/icon";
import { MediaCard } from "@/design/components/media-card";
import { RADIUS } from "@/design/foundations/geometry";
import { TONES } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { setFavoriteAction } from "@/features/account/actions";
import { movieHref } from "@/shared/site";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { loadLibraryPage } from "../actions";
import type {
  LibraryFilters,
  LibraryItem,
  LibraryKind,
  LibraryPage,
} from "../model";

function PinButton({
  item,
  onPinned,
}: {
  item: LibraryItem;
  onPinned: (pinned: boolean) => void;
}): JSX.Element {
  const { busy, run } = useConfirmedAction({
    fallback: "Could not update your favorites",
    name: "Library pin",
  });
  const next = !item.pinned;
  return (
    <Button
      aria-label={
        item.pinned ? `Unpin ${item.title}` : `Pin ${item.title} to favorites`
      }
      aria-pressed={item.pinned}
      className={cn(
        "absolute top-fib-2 right-fib-2 z-10 ui-fade",
        item.pinned ? "text-rated" : "opacity-0 group-hover/tile:opacity-100",
        busy && "opacity-100",
      )}
      disabled={busy}
      icon
      intent="glass"
      onClick={() =>
        run(async () => {
          const result = await setFavoriteAction(item.tmdbId, next);
          if (result.success) onPinned(next);
          return result;
        })
      }
      shape="thumb"
      size="sm"
    >
      <Icon
        icon={item.pinned ? "solar:star-bold" : "solar:star-linear"}
        size={15}
      />
    </Button>
  );
}

function Tile({
  canPin,
  item,
  onPinned,
}: {
  canPin: boolean;
  item: LibraryItem;
  onPinned: (pinned: boolean) => void;
}): JSX.Element {
  const label = item.year ? `${item.title} (${item.year})` : item.title;
  return (
    <li className="group/tile relative min-w-0" data-part="tile">
      <MediaCard
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={20}
        href={movieHref(item.tmdbId)}
        image={{
          sizes: "(min-width: 896px) 170px, 30vw",
          src: tmdbImageUrl("poster", item.posterPath, "w342"),
          srcSet:
            tmdbImageSrcSet("poster", item.posterPath, ["w185", "w342"]) ??
            undefined,
        }}
        label={label}
        radius={RADIUS.card}
        tooltip={item.pinned ? `${label} · Favorite` : label}
      />
      {canPin ? (
        <PinButton item={item} onPinned={onPinned} />
      ) : item.pinned ? (
        <span
          aria-label="Favorite"
          className="pointer-events-none absolute top-fib-2 right-fib-2 text-rated"
          role="img"
        >
          <Icon icon="solar:star-bold" size={15} />
        </span>
      ) : null}
    </li>
  );
}

export function LibraryShelf({
  empty,
  filters,
  isOwner,
  kind,
  page,
  username,
}: {
  empty: string;
  filters: LibraryFilters;
  isOwner: boolean;
  kind: LibraryKind;
  page: LibraryPage;
  username: string;
}): JSX.Element {
  const [served, setServed] = useState(page);
  const [items, setItems] = useState(page.items);
  const [next, setNext] = useState(page.next);
  const [pending, startTransition] = useTransition();
  if (page !== served) {
    setServed(page);
    setItems(page.items);
    setNext(page.next);
  }

  if (items.length === 0) {
    return (
      <p className="py-fib-6 text-center type-body text-ink-muted">{empty}</p>
    );
  }

  const more = () => {
    if (next === null) return;
    startTransition(async () => {
      const result = await loadLibraryPage({
        filters,
        kind,
        offset: next,
        username,
      });
      setItems((current) => [...current, ...result.items]);
      setNext(result.next);
    });
  };

  const pin = (tmdbId: number) => (pinned: boolean) =>
    setItems((current) =>
      current.map((item) =>
        item.tmdbId === tmdbId ? { ...item, pinned } : item,
      ),
    );

  return (
    <div className="flex flex-col gap-fib-5">
      <ul className="grid grid-cols-3 gap-fib-3 sm:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <Tile
            canPin={isOwner && kind === "likes"}
            item={item}
            key={item.tmdbId}
            onPinned={pin(item.tmdbId)}
          />
        ))}
      </ul>
      {next !== null ? (
        <button
          aria-busy={pending || undefined}
          className={cn(
            TONES.outline,
            "self-center rounded-full px-fib-4 h-control-sm type-control font-medium disabled:opacity-50",
          )}
          disabled={pending}
          onClick={more}
          type="button"
        >
          {pending ? "Loading…" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
