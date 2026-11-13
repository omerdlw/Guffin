"use client";

import { type ReactNode } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/dock";
import {
  MoviePosterLink,
  MoviePosterPlaceholder,
} from "@/features/movie/stage";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { SkeletonBlock } from "@/design/components/skeleton";
import { TONE } from "@/design/foundations/tones";
import { RADIUS } from "@/design/foundations/geometry";
import {
  RESULT_POSTER_GRID,
  RESULT_ROW_LIST,
  SEARCH_GROUP_LABELS,
  SEARCH_OVERVIEW,
  SEARCH_PER_PAGE,
} from "./constants";
import {
  ListResultRow,
  PersonResultRow,
  ReviewResultRow,
  Roll,
  UserResultRow,
} from "./results";
import type { SearchScope, SearchSection } from "./types";
import { SearchPart } from "./motion";

export function Option({
  active,
  children,
  halo = false,
  id,
  index,
  onPointerEnter,
}: {
  active: boolean;
  children: ReactNode;
  halo?: boolean;
  id: string;
  index: number;
  onPointerEnter: () => void;
}) {
  return (
    <li
      aria-selected={active}
      className="relative isolate min-w-0"
      data-active={active ? "" : undefined}
      data-kind={halo ? "tile" : "row"}
      id={id}
      onPointerEnter={onPointerEnter}
      role="option"
    >
      <SearchPart
        className="relative z-10 block min-w-0"
        index={index}
        name={halo ? "tile" : "row"}
      >
        {children}
      </SearchPart>
    </li>
  );
}

export function Spacers({
  count,
  kind,
}: {
  count: number;
  kind: "poster" | "row";
}) {
  if (count <= 0) return null;
  return Array.from({ length: count }, (_, index) =>
    kind === "poster" ? (
      <li aria-hidden="true" className="invisible min-w-0" inert key={index}>
        <MoviePosterPlaceholder />
      </li>
    ) : (
      <li aria-hidden="true" className="h-16" key={index} />
    ),
  );
}

function rowsOf(
  section: Exclude<SearchSection, { kind: "movies" | "shows" }>,
  onNavigated: () => void,
  query: string,
): { key: string | number; node: ReactNode }[] {
  switch (section.kind) {
    case "people":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <PersonResultRow
            onNavigated={onNavigated}
            person={hit}
            query={query}
          />
        ),
      }));
    case "users":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <UserResultRow onNavigated={onNavigated} query={query} user={hit} />
        ),
      }));
    case "lists":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <ListResultRow list={hit} onNavigated={onNavigated} query={query} />
        ),
      }));
    case "reviews":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <ReviewResultRow
            onNavigated={onNavigated}
            query={query}
            review={hit}
          />
        ),
      }));
  }
}

export function Section({
  active,
  lead,
  onNavigated,
  onOptionPointerEnter,
  optionId,
  query,
  section,
  spacers,
  start,
  titled,
  total,
}: {
  active: number;
  lead: number;
  onNavigated: () => void;
  onOptionPointerEnter: (index: number) => void;
  optionId: (index: number) => string;
  query: string;
  section: SearchSection;
  spacers: number;
  start: number;
  titled: boolean;
  total: number;
}) {
  const label = SEARCH_GROUP_LABELS[section.kind];
  const option = (
    offset: number,
    children: ReactNode,
    key: string | number,
    halo = false,
  ) => (
    <Option
      active={start + offset === active}
      halo={halo}
      id={optionId(start + offset)}
      index={lead + 1 + offset}
      key={key}
      onPointerEnter={() => onOptionPointerEnter(start + offset)}
    >
      {children}
    </Option>
  );

  const list =
    section.kind === "movies" || section.kind === "shows" ? (
      <ul aria-label={label} className={RESULT_POSTER_GRID} role="group">
        {section.hits.map((hit, offset) =>
          option(
            offset,
            <MoviePosterLink
              detail={hit.originalTitle}
              mediaType={section.kind === "shows" ? "tv" : "movie"}
              movie={hit}
              onNavigated={onNavigated}
              radius={RADIUS.tile}
              sizes="110px"
            />,
            hit.id,
            true,
          ),
        )}
        <Spacers count={spacers} kind="poster" />
      </ul>
    ) : (
      <ul aria-label={label} className={RESULT_ROW_LIST} role="group">
        {rowsOf(section, onNavigated, query).map(({ key, node }, offset) =>
          option(offset, node, key),
        )}
        <Spacers count={spacers} kind="row" />
      </ul>
    );

  if (!titled) return list;

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true">
        <SearchPart
          className="flex h-4 items-center justify-between px-1 text-ink-muted"
          index={lead}
          name="row"
        >
          <span className={TONE.label}>{label}</span>
          <span className="type-label font-semibold tabular-nums">
            <Roll value={total} />
          </span>
        </SearchPart>
      </div>
      {list}
    </div>
  );
}

export function ResultsSkeleton({ scope }: { scope: SearchScope }) {
  const posters =
    scope === "all"
      ? SEARCH_OVERVIEW.movies
      : scope === "movies" || scope === "shows"
        ? SEARCH_PER_PAGE[scope]
        : 0;
  const rows =
    scope === "all"
      ? 2
      : scope === "movies" || scope === "shows"
        ? 0
        : SEARCH_PER_PAGE[scope];

  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5">
      {posters > 0 ? (
        <div className={RESULT_POSTER_GRID}>
          {Array.from({ length: posters }, (_, index) => (
            <SkeletonBlock
              className="aspect-[2/3] w-full rounded-tile"
              key={index}
            />
          ))}
        </div>
      ) : null}
      {rows > 0 ? (
        <div className={RESULT_ROW_LIST}>
          {Array.from({ length: rows }, (_, index) => (
            <div className="flex h-16 items-center gap-3 p-2" key={index}>
              <SkeletonBlock className="h-12 w-8 shrink-0 rounded-thumb" />
              <div className="flex flex-1 flex-col gap-2">
                <SkeletonBlock className="h-3.5 w-1/2 rounded-full" />
                <SkeletonBlock className="h-3 w-3/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PagerButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  onClick: () => void;
}) {
  const actionClass = useDockActionClass();
  return (
    <Button
      aria-label={direction === "next" ? "Next page" : "Previous page"}
      className={actionClass({
        className:
          "size-8 shrink-0 px-0 disabled:pointer-events-none disabled:opacity-50",
      })}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon
        icon={
          direction === "next"
            ? "solar:alt-arrow-right-linear"
            : "solar:alt-arrow-left-linear"
        }
        size={16}
      />
    </Button>
  );
}
