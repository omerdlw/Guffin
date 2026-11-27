"use client";

import { type JSX, useState } from "react";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { SegmentedControl } from "@/design/components/segmented-control";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { MoviePosterLink } from "@/features/movie/components/stage";
import { AvatarStack } from "@/features/social/components/social-proof";
import { formatCompact, formatReleaseDay } from "@/shared/format";
import {
  CANON_LIMIT,
  CAPTION_CLASS,
  type Member,
  POPULAR_LIMIT,
  POSTER_SIZES,
  type PopularFilm,
  type RatedFilm,
  ROW_ITEM_CLASS,
  type ShowingFilm,
} from "../model";
import { Heading, HomePart, HomeSection, HomeSwap } from "../motion";
import { FilmTitle } from "./primitives";

type FilmShelf = "theatres" | "soon";

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
  const small =
    shelf === "theatres"
      ? "In theatres"
      : waiting
        ? `${waiting} want to see`
        : "Release day";

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

const toAvatarPeople = (members: Member[]) =>
  members.map((member) => ({ ...member, id: member.username }));

export function HomePopular({
  films,
}: {
  films: PopularFilm[];
}): JSX.Element | null {
  if (films.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="popular">
      <Heading title="Popular with members" />
      <ul className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">
        {films.slice(0, POPULAR_LIMIT).map((film, index) => (
          <HomePart as="li" index={index} key={film.id} name="card">
            <MoviePosterLink
              caption={
                <span className={CAPTION_CLASS}>
                  {film.faces.length > 0 ? (
                    <AvatarStack
                      people={toAvatarPeople(film.faces.slice(0, 3))}
                      round
                      size={16}
                    />
                  ) : (
                    <Icon icon="solar:eye-bold" size={12} />
                  )}
                  <span className="truncate">
                    {formatCompact(film.members)}
                  </span>
                  {film.rating ? (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-0.5">
                      <Icon
                        className="text-rated"
                        icon="solar:star-bold"
                        size={11}
                      />
                      {film.rating.toFixed(1)}
                    </span>
                  ) : null}
                </span>
              }
              movie={film}
              radius={RADIUS.card}
              sizes="(min-width: 1024px) 15vw, (min-width: 640px) 22vw, 30vw"
            />
          </HomePart>
        ))}
      </ul>
    </HomeSection>
  );
}

function Rank({
  film,
  index,
}: {
  film: RatedFilm;
  index: number;
}): JSX.Element {
  return (
    <HomePart
      as="li"
      className="grid grid-cols-[2.25rem_3rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4"
      index={index}
      name="rank"
    >
      <span className="text-right font-zuume type-display-xs leading-none font-bold text-ink-faint tabular-nums">
        {index + 1}
      </span>
      <MoviePosterLink movie={film} radius={RADIUS.thumb} sizes="48px" />
      <div className="flex min-w-0 flex-col gap-1">
        <FilmTitle className="type-copy" film={film} />
        <span className="type-meta text-ink-muted tabular-nums">
          {formatCompact(film.ratings)} ratings
        </span>
      </div>
      <span className="flex items-center gap-1.5">
        <span className="font-zuume type-display-xs leading-none font-bold text-ink tabular-nums">
          {film.rating.toFixed(2)}
        </span>
        <Icon className="text-rated" icon="solar:star-bold" size={14} />
      </span>
    </HomePart>
  );
}

export function HomeCanon({
  films,
}: {
  films: RatedFilm[];
}): JSX.Element | null {
  if (films.length === 0) return null;
  const ranked = films.slice(0, CANON_LIMIT);
  const half = Math.ceil(ranked.length / 2);
  const columns = [ranked.slice(0, half), ranked.slice(half)];

  return (
    <HomeSection className="flex w-full flex-col" cue="canon">
      <Heading title="Highest rated by members" />
      <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-2">
        {columns.map((column, side) =>
          column.length > 0 ? (
            <ol
              className={`flex flex-col divide-y ${TONE.rules} border-t border-rule max-lg:not-first:border-t-0 lg:border-b`}
              key={side}
              start={side * half + 1}
            >
              {column.map((film, index) => (
                <Rank film={film} index={side * half + index} key={film.id} />
              ))}
            </ol>
          ) : null,
        )}
      </div>
    </HomeSection>
  );
}
