"use client";

import type { JSX } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/dock";
import { Button, Image } from "@omerdlw/base-framework/ui";
import { ActionIcon, ActionLabel } from "@/design/components/action-content";
import { Icon } from "@/design/components/icon";
import { Link } from "@/design/components/link";
import { DockClear } from "@/design/dock/clear";
import { DockAction } from "@/design/surface/surface";
import { cn } from "@/design/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { movieHref } from "@/shared/site";
import type { CanonFilm } from "../model";

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
          <ActionIcon icon={seen ? "solar:check-bold" : "solar:eye-bold"} />
          <ActionLabel>{seen ? "Watched" : "Mark watched"}</ActionLabel>
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
            <ActionIcon
              icon={listed ? "solar:bookmark-bold" : "solar:bookmark-linear"}
            />
            <ActionLabel>{listed ? "Saved" : "Watchlist"}</ActionLabel>
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
    <div className="fixed inset-0 overflow-y-auto px-4 pt-10 pb-[calc(6rem+3rem)] sm:px-8">
      <DockClear extra="3rem" />
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
                    : "opacity-70 hover:opacity-100",
                )}
                href={movieHref(entry.id)}
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
