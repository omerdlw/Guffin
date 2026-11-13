"use client";

import { useMemo, useState } from "react";
import { Button, SegmentedControl } from "@omerdlw/base-framework/ui";
import { Select } from "@/design/components/select";
import { RADIUS } from "@/design/foundations/geometry";
import { Heading } from "@/features/detail/layout";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import { MoviePosterLink } from "@/features/movie/stage";
import { sortFilmography } from "./credits";
import {
  type ByMedium,
  FILMOGRAPHY_GRID_CLASS,
  type FilmographyGroup,
  type FilmographySort,
  PERSON_FILMOGRAPHY_PREVIEW,
} from "./person";
import { PersonMediumControl, usePersonMedium } from "./views";

const PERSON_DEFAULT_SORT: FilmographySort = "popularity";

const FILMOGRAPHY_SORTS: readonly {
  key: FilmographySort;
  label: string;
}[] = [
  { key: "popularity", label: "Popularity" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Film name" },
];

const SORT_OPTIONS = FILMOGRAPHY_SORTS.map(({ key, label }) => ({
  label,
  value: key,
}));

function isFilmographySort(value: unknown): value is FilmographySort {
  return FILMOGRAPHY_SORTS.some((sort) => sort.key === value);
}

export function PersonFilmography({
  filmography,
  now = false,
}: {
  filmography: ByMedium<FilmographyGroup[]>;
  now?: boolean;
}) {
  const [medium, setMedium] = usePersonMedium();
  const groups = filmography[medium];
  const [picked, setPicked] = useState<ByMedium<string | null>>({
    movie: null,
    tv: null,
  });
  const active = picked[medium] ?? groups[0]?.key ?? "";
  const setActive = (key: string) =>
    setPicked((current) => ({ ...current, [medium]: key }));
  const [sort, setSort] = useState<FilmographySort>(PERSON_DEFAULT_SORT);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const group = groups.find((item) => item.key === active) ?? groups[0];
  const credits = useMemo(
    () => (group ? sortFilmography(group.credits, sort) : []),
    [group, sort],
  );
  if (!group) return null;

  const expandKey = `${medium}:${group.key}`;
  const showAll = expanded.has(expandKey);
  const visible = showAll
    ? credits
    : credits.slice(0, PERSON_FILMOGRAPHY_PREVIEW);
  const several = groups.length > 1;

  return (
    <DetailSection className="flex w-full flex-col" cue="board" now={now}>
      <Heading
        actions={
          <div className="flex items-center gap-2">
            <PersonMediumControl medium={medium} onChange={setMedium} />
            <Select
              ariaLabel="Sort filmography"
              className="w-44"
              shape="pill"
              onChange={(value) => isFilmographySort(value) && setSort(value)}
              options={SORT_OPTIONS}
              size="sm"
              value={sort}
            />
          </div>
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
        id={`${medium}:${group.key}:${sort}`}
        now={now}
      >
        <ul className={FILMOGRAPHY_GRID_CLASS}>
          {visible.map((credit, index) => (
            <li
              className="min-w-0 overflow-hidden"
              key={credit.key}
              style={{ borderRadius: RADIUS.card }}
            >
              <DetailPart index={index} name="tile">
                <MoviePosterLink
                  detail={credit.role}
                  mediaType={credit.mediaType}
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
              shape="pill"
              width="full"
              intent="neutral"
              className="cine-press ui-still mt-3"
              onClick={() => setExpanded(new Set(expanded).add(expandKey))}
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
