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
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { MediaCard } from "@/design/components/media-card";
import { DockAction } from "@/design/components/surface";
import { RADIUS } from "@/design/foundations/geometry";
import {
  DirectorsPart,
  DirectorsStage,
  DirectorsSwap,
} from "@/features/spotlights/motion";
import {
  SpotlightDock,
  useDockWidth,
  useGestureStep,
  useSyncedSearchParam,
} from "@/features/spotlights/shell";
import type { Director } from "@/features/spotlights/spotlights";
import { DIRECTORS_HREF, movieHref, personHref } from "@/lib/project";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";

interface DirectorsLayout {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  core: number;
  coreRows: number;
  rows: number;
  sideWidth: number;
  slots: number;
}

interface DirectorsPlace {
  column: number;
  rank: number;
  row: number;
}

interface DirectorsSize {
  height: number;
  width: number;
}

const DIRECTORS_GAP = 8;

const DIRECTORS_POSTER_RATIO = 1.5;

const DIRECTORS_MIN_CELL = 44;

const DIRECTORS_MAX_CORE = 10;

const DIRECTORS_SHOWN = 0.6;

const DIRECTORS_GROW = 1.1;

const DIRECTORS_SHRINK = 0.9;

const DIRECTORS_CORE_TALL = 0.74;

const DIRECTORS_MIN_SLOTS = 12;

const DIRECTORS_FACE_MIN = 0.4;

const DIRECTORS_FACE_STEP = 0.05;

const DIRECTORS_DOCK_WIDTH = 460;

const DIRECTOR_POSTER_WIDTHS = ["w92", "w185"] as const;

const lifeSpanOf = (director: Director) =>
  director.died ? `${director.born}–${director.died}` : `Born ${director.born}`;

function fitDirectors(
  width: number,
  height: number,
  count: number,
  dock: number,
): DirectorsLayout {
  const need = Math.ceil(count * DIRECTORS_SHOWN);
  const floor = Math.min(count, DIRECTORS_MIN_SLOTS);
  let best: DirectorsLayout | null = null;
  for (
    let scale = 1;
    scale >= DIRECTORS_FACE_MIN;
    scale -= DIRECTORS_FACE_STEP
  ) {
    const face = dock * scale;
    let fullest: DirectorsLayout | null = null;
    for (let core = 2; core <= DIRECTORS_MAX_CORE; core += 1) {
      const cellWidth = (face - DIRECTORS_GAP * (core - 1)) / core;
      if (cellWidth < DIRECTORS_MIN_CELL) break;
      const natural = cellWidth * DIRECTORS_POSTER_RATIO;
      const rowsMax = Math.floor(
        (height + DIRECTORS_GAP) / (natural * DIRECTORS_SHRINK + DIRECTORS_GAP),
      );
      const across = Math.floor(
        (width + DIRECTORS_GAP) / (cellWidth + DIRECTORS_GAP),
      );
      const sidesMax = Math.max(0, Math.floor((across - core) / 2));
      let found: DirectorsLayout | null = null;
      for (
        let coreRows = core;
        coreRows >= Math.ceil(core * DIRECTORS_CORE_TALL);
        coreRows -= 1
      ) {
        for (let side = 0; side <= sidesMax; side += 1) {
          const columns = core + 2 * side;
          const sideWidth =
            side > 0
              ? Math.min(
                  (width - face) / (2 * side) - DIRECTORS_GAP,
                  cellWidth * DIRECTORS_GROW,
                )
              : cellWidth;
          for (let rows = coreRows + 1; rows <= rowsMax; rows += 1) {
            const slots = (rows - coreRows) * columns + 2 * side * coreRows;
            if (slots > count) break;
            const cellHeight = Math.min(
              (height - DIRECTORS_GAP * (rows - 1)) / rows,
              natural * DIRECTORS_GROW,
            );
            const layout = {
              cellHeight,
              cellWidth,
              columns,
              core,
              coreRows,
              rows,
              sideWidth,
              slots,
            };
            const enough = slots >= need;
            const held = found && found.slots >= need;
            if (
              !found ||
              (enough && !held) ||
              (enough === held && slots > found.slots)
            )
              found = layout;
          }
        }
      }
      if (!found) continue;
      if (found.slots >= need) return found;
      if (!fullest || found.slots > fullest.slots) fullest = found;
    }
    if (fullest && scale === 1 && fullest.slots >= floor) return fullest;
    if (fullest && (!best || fullest.slots > best.slots)) best = fullest;
  }
  if (best) return best;
  const cellHeight = (height - DIRECTORS_GAP) / 2;
  const cellWidth = cellHeight / DIRECTORS_POSTER_RATIO;
  return {
    cellHeight,
    cellWidth,
    columns: 2,
    core: 2,
    coreRows: 2,
    rows: 2,
    sideWidth: cellWidth,
    slots: 0,
  };
}

function placesOf({
  cellHeight,
  cellWidth,
  columns,
  core,
  coreRows,
  rows,
}: DirectorsLayout): DirectorsPlace[] {
  const column0 = (columns - core) / 2;
  const row0 = rows - coreRows;
  const cells: Omit<DirectorsPlace, "rank">[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const inside =
        row >= row0 && column >= column0 && column < column0 + core;
      if (!inside) cells.push({ column: column + 1, row: row + 1 });
    }
  }
  const across = cellWidth + DIRECTORS_GAP;
  const down = cellHeight + DIRECTORS_GAP;
  const reach = (cell: Omit<DirectorsPlace, "rank">) => {
    const x = Math.abs(cell.column - 0.5 - columns / 2) * across;
    const y = (row0 - (cell.row - 0.5)) * down;
    const beside = Math.max(0, x - (core * across) / 2);
    const above = Math.max(0, y);
    return Math.hypot(beside, above) + Math.hypot(x, y) / 1000;
  };
  const order = cells
    .map((cell, i) => ({ i, reach: reach(cell) }))
    .sort((a, b) => a.reach - b.reach || a.i - b.i);
  const ranks = new Map(order.map(({ i }, rank) => [i, rank]));
  return cells.map((cell, i) => ({ ...cell, rank: ranks.get(i)! }));
}

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
