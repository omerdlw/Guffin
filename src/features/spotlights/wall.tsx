"use client";

import { type JSX, useRef } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/dock";
import { mediaHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Link, TextButton } from "@/design/components/link";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { DockAction } from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import { TOP_100_FILTERS } from "./constants";
import type { CanonFilm, Filter } from "./types";
import { votesOf } from "./utils";
import { Image } from "@/design/components/image";

export function SeenPanel({
  count,
  filter,
  onFilter,
  opened,
  total,
}: {
  count: number;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  opened: boolean;
  total: number;
}): JSX.Element {
  return (
    <div
      className={cn(
        "fixed top-[clamp(1.25rem,4.5svh,2.5rem)] right-4 z-10 flex flex-col items-end gap-3 transition-opacity duration-settle ease-out-quint sm:right-8",
        opened ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <p className="flex items-end gap-2.5 text-ink">
        <span className="font-zuume type-display-sm leading-crop lg:type-display-md font-bold tabular-nums">
          {count}
        </span>
        <span className="pb-1 type-meta leading-none text-ink-muted">
          of {total} seen
        </span>
      </p>
      <span
        aria-hidden="true"
        className="relative block h-px w-36 bg-fill-active"
      >
        <span
          className="absolute inset-y-0 left-0 bg-ink-body transition-[width] duration-settle ease-out-quint"
          style={{ width: `${(count / total) * 100}%` }}
        />
      </span>
      <div aria-label="Show" className="flex gap-4 type-meta" role="radiogroup">
        {TOP_100_FILTERS.map((option) => (
          <TextButton
            aria-checked={filter === option.value}
            className={cn("py-1", filter === option.value && "text-ink")}
            key={option.value}
            onClick={() => onFilter(option.value)}
            role="radio"
          >
            {option.label}
          </TextButton>
        ))}
      </div>
    </div>
  );
}

export function Facts({
  film,
  opened,
}: {
  film: CanonFilm;
  opened: boolean;
}): JSX.Element {
  const where = [film.year, ...film.genres.slice(0, 2)]
    .filter(Boolean)
    .join(" \u00b7 ");
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-[calc(var(--dock-h,6rem)+4.75rem)] z-10 flex flex-col items-center gap-2 text-center transition-opacity duration-settle ease-out-quint sm:inset-x-8",
        opened ? "opacity-100" : "opacity-0",
      )}
    >
      <p className="type-meta text-ink-muted tabular-nums">No. {film.rank}</p>
      <h2 className="max-w-full truncate font-zuume type-display-sm leading-crop font-bold text-ink lg:type-display-md">
        {film.title}
      </h2>
      <p className="flex items-center gap-2 type-meta text-ink-muted">
        {film.rating ? (
          <>
            <Icon icon="solar:star-bold" size={14} />
            <span className="text-ink-lead tabular-nums">
              {film.rating.toFixed(1)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{votesOf(film.votes)} votes</span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <span>{where}</span>
      </p>
    </div>
  );
}

export function Rail({
  films,
  onPick,
  opened,
  selected,
  watched,
}: {
  films: CanonFilm[];
  onPick: (index: number) => void;
  opened: boolean;
  selected: number;
  watched: ReadonlySet<number>;
}): JSX.Element {
  const track = useRef<HTMLDivElement>(null);
  const count = films.length;
  const at = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return selected;
    const share = Math.min(
      0.9999,
      Math.max(0, (clientX - rect.left) / rect.width),
    );
    return count - 1 - Math.floor(share * count);
  };
  const film = films[selected]!;
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(var(--dock-h,6rem)+1.25rem)] z-10 px-4 transition-opacity duration-settle ease-out-quint sm:px-8",
        opened ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <span className="type-micro text-ink-muted tabular-nums">{count}</span>
        <div
          aria-label="Position in the countdown"
          aria-orientation="horizontal"
          aria-valuemax={count}
          aria-valuemin={1}
          aria-valuenow={film.rank}
          aria-valuetext={`No. ${film.rank}, ${film.title}`}
          className="flex h-9 min-w-0 flex-1 cursor-pointer touch-none items-end gap-px"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            onPick(at(event.clientX));
          }}
          onPointerMove={(event) => {
            if (event.buttons) onPick(at(event.clientX));
          }}
          ref={track}
          role="slider"
          tabIndex={0}
        >
          {films
            .map((entry, index) => ({ entry, index }))
            .reverse()
            .map(({ entry, index }) => (
              <span
                className="flex h-full min-w-0 flex-1 items-end justify-center"
                key={entry.id}
              >
                <span
                  className={cn(
                    "block w-px rounded-full transition-[height,background-color] duration-light ease-out-cream",
                    index === selected
                      ? "h-full bg-ink"
                      : watched.has(entry.id)
                        ? "h-3.5 bg-ink-body"
                        : "h-2 bg-fill-active",
                  )}
                />
              </span>
            ))}
        </div>
        <span className="type-micro text-ink-muted tabular-nums">1</span>
      </div>
    </div>
  );
}

export function WallAction({
  disabled,
  listed,
  onOpen,
  onToggle,
  seen,
  title,
}: {
  disabled: boolean;
  listed: boolean;
  onOpen: () => void;
  onToggle: (kind: "watched" | "watchlist") => void;
  seen: boolean;
  title: string;
}): JSX.Element {
  const actionClass = useDockActionClass();
  return (
    <DockAction>
      <div className="flex w-full gap-2">
        <Button
          aria-pressed={seen}
          className={actionClass({
            className: "min-w-0 flex-1",
            isActive: seen,
          })}
          disabled={disabled}
          onClick={() => onToggle("watched")}
          type="button"
        >
          <Icon
            icon={seen ? "solar:check-circle-bold" : "solar:eye-bold"}
            size={16}
          />
          <span className="truncate">{seen ? "Seen" : "Mark seen"}</span>
        </Button>
        {seen ? null : (
          <Button
            aria-pressed={listed}
            className={actionClass({
              className: "min-w-0 flex-1",
              isActive: listed,
            })}
            disabled={disabled}
            onClick={() => onToggle("watchlist")}
            type="button"
          >
            <Icon
              icon={listed ? "solar:bookmark-bold" : "solar:bookmark-linear"}
              size={16}
            />
            <span className="truncate">{listed ? "Saved" : "Watchlist"}</span>
          </Button>
        )}
        <Button
          aria-label={`Open ${title}`}
          className={actionClass({ className: "w-12 shrink-0 px-0" })}
          onClick={onOpen}
          type="button"
        >
          <Icon icon="solar:arrow-right-up-linear" size={16} />
        </Button>
      </div>
    </DockAction>
  );
}

export function PlainWall({
  films,
  watched,
}: {
  films: CanonFilm[];
  watched: ReadonlySet<number>;
}): JSX.Element {
  return (
    <div className="fixed inset-0 overflow-y-auto px-4 pt-10 pb-[calc(var(--dock-h,6rem)+3rem)] sm:px-8">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
        {films.map((entry) => {
          const src = tmdbImageUrl("poster", entry.posterPath, "w185");
          return (
            <li key={entry.id}>
              <Link
                className={cn(
                  "ui-fade block overflow-hidden",
                  watched.has(entry.id)
                    ? "opacity-100"
                    : "opacity-70 hover:opacity-100 focus-visible:opacity-100",
                )}
                href={mediaHref(entry.mediaType ?? "movie", entry.id)}
              >
                <Image
                  alt={`No. ${entry.rank}: ${entry.title}`}
                  src={src}
                  wrapperClassName="aspect-[2/3] h-auto"
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
