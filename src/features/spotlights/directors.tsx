"use client";

import {
  type CSSProperties,
  type JSX,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDockActionClass } from "@omerdlw/base-framework/dock";
import { DIRECTORS_HREF, movieHref, personHref } from "@/lib/project";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { MediaCard } from "@/design/components/media-card";
import { DockAction } from "@/design/components/surface";
import { RADIUS } from "@/design/foundations/geometry";
import {
  DIRECTOR_POSTER_WIDTHS,
  DIRECTORS_DOCK_WIDTH,
  DIRECTORS_GAP,
} from "./constants";
import { DirectorsPart, DirectorsStage, DirectorsSwap } from "./motion";
import {
  SpotlightDock,
  useDockWidth,
  useGestureStep,
  useSyncedSearchParam,
} from "./shell";
import type { Director, DirectorsLayout, DirectorsSize } from "./types";
import { fitDirectors, lifeSpanOf, placesOf } from "./utils";

const Portrait = memo(function Portrait({
  director,
  layout,
}: {
  director: Director;
  layout: DirectorsLayout;
}): JSX.Element {
  const { cellWidth, columns, core, coreRows, rows } = layout;
  const side = core * cellWidth + (core - 1) * DIRECTORS_GAP;
  return (
    <li
      className="min-h-0 min-w-0"
      style={
        {
          gridColumn: `${(columns - core) / 2 + 1} / span ${core}`,
          gridRow: `${rows - coreRows + 1} / span ${coreRows}`,
        } as CSSProperties
      }
    >
      <DirectorsPart className="size-full" name="portrait">
        <MediaCard
          aspect="free"
          className="size-full"
          frameClassName="size-full grayscale"
          href={personHref(director.id)}
          image={{
            priority: true,
            sizes: `${Math.round(side)}px`,
            src: tmdbImageUrl("profile", director.profilePath, "h632"),
          }}
          label={`Open the profile of ${director.name}`}
          radius={RADIUS.card}
          tooltip="Open profile"
        />
      </DirectorsPart>
    </li>
  );
});

const Wall = memo(function Wall({
  director,
  layout,
}: {
  director: Director;
  layout: DirectorsLayout;
}): JSX.Element {
  const { cellHeight, cellWidth, columns, core, rows, sideWidth, slots } =
    layout;
  const side = (columns - core) / 2;
  const places = useMemo(
    () => placesOf(layout).sort((a, b) => a.rank - b.rank),
    [layout],
  );
  const films = useMemo(
    () => director.films.slice(0, slots),
    [director.films, slots],
  );
  return (
    <ol
      aria-label={`Films by ${director.name}`}
      className="grid shrink-0"
      role="list"
      style={{
        gap: DIRECTORS_GAP,
        gridTemplateColumns: [
          side > 0 ? `repeat(${side}, ${sideWidth}px)` : "",
          `repeat(${core}, ${cellWidth}px)`,
          side > 0 ? `repeat(${side}, ${sideWidth}px)` : "",
        ]
          .filter(Boolean)
          .join(" "),
        gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
      }}
    >
      <Portrait director={director} layout={layout} />
      {films.map((film, i) => {
        const place = places[i]!;
        const title = film.year ? `${film.title} (${film.year})` : film.title;
        return (
          <li
            className="min-h-0 min-w-0"
            key={film.id}
            style={{ gridColumn: place.column, gridRow: place.row }}
          >
            <DirectorsPart
              className="size-full"
              index={place.rank}
              name="poster"
            >
              <MediaCard
                aspect="free"
                className="size-full"
                frameClassName="size-full"
                href={movieHref(film.id)}
                image={{
                  sizes: `${Math.round(Math.max(cellWidth, sideWidth))}px`,
                  src: tmdbImageUrl("poster", film.posterPath, "w185"),
                  srcSet:
                    tmdbImageSrcSet(
                      "poster",
                      film.posterPath,
                      DIRECTOR_POSTER_WIDTHS,
                    ) ?? undefined,
                }}
                label={title}
                radius={RADIUS.thumb}
                tooltip={title}
              />
            </DirectorsPart>
          </li>
        );
      })}
    </ol>
  );
});

function DirectorsAction({
  count,
  index,
  onStep,
}: {
  count: number;
  index: number;
  onStep: (direction: -1 | 1) => void;
}): JSX.Element {
  const actionClass = useDockActionClass();
  return (
    <DockAction>
      <div className="flex w-full items-center gap-2">
        <Button
          aria-label="Previous director"
          className={actionClass({ className: "min-w-0 flex-1" })}
          onClick={() => onStep(-1)}
          type="button"
        >
          <Icon icon="solar:alt-arrow-left-bold" size={16} />
        </Button>
        <p
          aria-live="polite"
          className="min-w-16 text-center type-meta text-ink-muted tabular-nums"
        >
          <span className="text-ink">{index + 1}</span>
          <span className="text-ink-faint"> / </span>
          {count}
        </p>
        <Button
          aria-label="Next director"
          className={actionClass({ className: "min-w-0 flex-1" })}
          onClick={() => onStep(1)}
          type="button"
        >
          <Icon icon="solar:alt-arrow-right-bold" size={16} />
        </Button>
      </div>
    </DockAction>
  );
}

function Directors({
  directors,
  initial,
}: {
  directors: Director[];
  initial: number;
}): JSX.Element {
  const area = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initial);
  const [size, setSize] = useState<DirectorsSize | null>(null);
  const director = directors[index]!;

  const step = useCallback(
    (direction: -1 | 1) =>
      setIndex((at) => (at + direction + directors.length) % directors.length),
    [directors.length],
  );
  useGestureStep(step);
  useSyncedSearchParam("director", String(director.id));

  useLayoutEffect(() => {
    const element = area.current;
    if (!element) return;
    const measure = () => {
      const next = { height: element.clientHeight, width: element.clientWidth };
      setSize((size) =>
        size?.height === next.height && size.width === next.width ? size : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const control = useMemo(
    () => (
      <DirectorsAction count={directors.length} index={index} onStep={step} />
    ),
    [directors.length, index, step],
  );
  const count = director.films.length;
  const dock = useDockWidth(DIRECTORS_DOCK_WIDTH);
  const layout = useMemo(
    () => (size ? fitDirectors(size.width, size.height, count, dock) : null),
    [count, dock, size],
  );

  return (
    <>
      <SpotlightDock
        control={control}
        description={[lifeSpanOf(director), director.place]
          .filter(Boolean)
          .join(" · ")}
        href={personHref(director.id)}
        icon={tmdbImageUrl("profile", director.profilePath, "w185")!}
        path={DIRECTORS_HREF}
        title={director.name}
      />
      <h1 className="sr-only">
        Twenty great directors, each with the films they made around them
      </h1>

      <div className="relative z-10 h-dvh w-full px-2 pt-2">
        <div className="flex size-full items-end justify-center" ref={area}>
          {layout ? (
            <DirectorsSwap cue="director" id={String(director.id)} now>
              <Wall director={director} layout={layout} />
            </DirectorsSwap>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function DirectorsView(props: {
  directors: Director[];
  initial: number;
}): JSX.Element {
  return (
    <DirectorsStage>
      <Directors {...props} />
    </DirectorsStage>
  );
}
