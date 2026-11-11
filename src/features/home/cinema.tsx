"use client";

import { type JSX, useState } from "react";
import { MoviePosterLink } from "@/features/movie/stage";
import { Carousel } from "@/design/components/carousel";
import { SegmentedControl } from "@/design/components/segmented-control";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { POSTER_SIZES, ROW_ITEM_CLASS } from "./constants";
import { Heading, HomeSection, HomeSwap } from "./motion";
import type { FilmShelf, ShowingFilm } from "./types";
import { formatCompact, formatReleaseDay } from "./utils";

function Ticket({
  film,
  shelf,
}: {
  film: ShowingFilm;
  shelf: FilmShelf;
}): JSX.Element {
  const date = film.releaseDate ? formatReleaseDay(film.releaseDate) : null;
  const waiting = film.waiting > 0 ? formatCompact(film.waiting) : null;
  const big = date ?? waiting ?? "Now";
  const small = waiting
    ? `${waiting} want to see`
    : shelf === "soon"
      ? "Release day"
      : "In theatres";

  return (
    <span className="mt-1 flex min-w-0 flex-col gap-1.5 border-t border-dashed border-line pt-3">
      <span className="font-zuume truncate type-display-xs leading-none font-bold text-ink uppercase tabular-nums">
        {big}
      </span>
      <span className="truncate type-meta font-medium text-ink-muted">
        {small}
      </span>
    </span>
  );
}

export function HomeShowing({
  soon,
  theatres,
}: {
  soon: ShowingFilm[];
  theatres: ShowingFilm[];
}): JSX.Element | null {
  const [shelf, setShelf] = useState<FilmShelf>(
    theatres.length > 0 ? "theatres" : "soon",
  );
  if (theatres.length + soon.length === 0) return null;

  const shelves = [
    { films: theatres, key: "theatres" as const, label: "In theatres" },
    { films: soon, key: "soon" as const, label: "Coming soon" },
  ].filter((entry) => entry.films.length > 0);
  const current = shelves.find((entry) => entry.key === shelf) ?? shelves[0];

  return (
    <HomeSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          shelves.length > 1 ? (
            <SegmentedControl
              ariaLabel="Showing"
              items={shelves}
              onChange={setShelf}
              value={current.key}
            />
          ) : null
        }
        title="At the cinema"
      />
      <HomeSwap cue="slides" id={current.key}>
        <Carousel
          arrowClassName={TONE.arrows}
          itemClassName={ROW_ITEM_CLASS}
          label={current.label}
          part="slide"
        >
          {current.films.map((film) => (
            <MoviePosterLink
              caption={<Ticket film={film} shelf={current.key} />}
              key={film.id}
              movie={film}
              radius={RADIUS.card}
              sizes={POSTER_SIZES}
            />
          ))}
        </Carousel>
      </HomeSwap>
    </HomeSection>
  );
}
