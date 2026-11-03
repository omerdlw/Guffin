"use client";

import { useMemo, useState } from "react";
import { MoviePosterLink } from "@/features/movie";
import { Button, RADIUS, SegmentedControl, Select, TONE } from "@/ui";
import { PERSON_DEFAULT_SORT, PERSON_FILMOGRAPHY_PREVIEW } from "../constants";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
  Heading,
} from "@/features/detail";
import { FILMOGRAPHY_GRID_CLASS } from "../styles";
import type { FilmographyGroup, FilmographySort } from "../types";
import {
  FILMOGRAPHY_SORTS,
  isFilmographySort,
  sortFilmography,
} from "../credits";

const SORT_OPTIONS = FILMOGRAPHY_SORTS.map(({ key, label }) => ({
  label,
  value: key,
}));

export function PersonFilmography({
  groups,
}: {
  groups: readonly FilmographyGroup[];
}) {
  const [active, setActive] = useState(groups[0]?.key ?? "");
  const [sort, setSort] = useState<FilmographySort>(PERSON_DEFAULT_SORT);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const group = groups.find((item) => item.key === active) ?? groups[0];
  const credits = useMemo(
    () => (group ? sortFilmography(group.credits, sort) : []),
    [group, sort],
  );
  if (!group) return null;

  const showAll = expanded.has(group.key);
  const visible = showAll
    ? credits
    : credits.slice(0, PERSON_FILMOGRAPHY_PREVIEW);
  const several = groups.length > 1;

  return (
    <DetailSection className="flex w-full flex-col" cue="board">
      <Heading
        actions={
          <Select
            ariaLabel="Sort filmography"
            className="w-44"
            classNames={TONE.select}
            onChange={(value) => isFilmographySort(value) && setSort(value)}
            options={SORT_OPTIONS}
            size="sm"
            value={sort}
          />
        }
        icon="solar:clapperboard-play-bold"
        title={
          several
            ? "Filmography"
            : `Filmography · ${group.label} (${group.total})`
        }
      />

      {several ? (
        <DetailPart className="mb-6 flex w-full items-center" name="control">
          <SegmentedControl
            ariaLabel="Kind of work"
            className={TONE.tabs}
            items={groups.map((item) => ({
              key: item.key,
              label: `${item.label} (${item.total})`,
            }))}
            onChange={setActive}
            value={group.key}
          />
        </DetailPart>
      ) : null}

      <DetailSwap
        className="flex flex-col"
        cue="tiles"
        id={`${group.key}:${sort}`}
      >
        <ul className={FILMOGRAPHY_GRID_CLASS}>
          {visible.map((credit, index) => (
            // Each poster opens up inside its own frame.
            <li
              className="min-w-0 overflow-hidden"
              key={credit.key}
              style={{ borderRadius: RADIUS.card }}
            >
              <DetailPart index={index} name="tile">
                <MoviePosterLink
                  detail={credit.role}
                  radius={RADIUS.card}
                  movie={{
                    id: credit.id,
                    posterPath: credit.posterPath,
                    title: credit.title,
                    year: credit.year,
                  }}
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 20vw, 30vw"
                />
              </DetailPart>
            </li>
          ))}
        </ul>
        {credits.length > visible.length ? (
          <DetailPart index={visible.length} name="tile">
            <Button
              className={`mt-3 ${TONE.more}`}
              onClick={() => setExpanded(new Set(expanded).add(group.key))}
              type="button"
            >
              Show all {credits.length}
            </Button>
          </DetailPart>
        ) : null}
      </DetailSwap>
    </DetailSection>
  );
}
