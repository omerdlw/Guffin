"use client";

import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkTarget } from "@/features/artwork/utils";
import { WALL_SIZES } from "@/features/detail/constants";
import { Heading } from "@/features/detail/layout";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import {
  DetailAction,
  DetailViews,
  GalleryWall,
  ImageModal,
  useLead,
  WallButton,
} from "@/features/detail/stage";
import type { ImageModalData, WallSet } from "@/features/detail/types";
import { MoviePosterLink } from "@/features/movie/stage";
import {
  type Awards,
  type PersonImage,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { Button } from "@/ui/button";
import { SegmentedControl, Select } from "@/ui/form";
import { Carousel, MediaCard } from "@/ui/media";
import { SurfacePart, SurfaceProse, SurfaceStage } from "@/ui/surface";
import { RADIUS, TONE } from "@/ui/tokens";
import {
  BIO_SURFACE_WIDTH,
  FILMOGRAPHY_GRID_CLASS,
  GALLERY_VIEWS,
  PERSON_DEFAULT_SORT,
  PERSON_FILMOGRAPHY_PREVIEW,
  SORT_OPTIONS,
  VIEW_ACTIONS,
} from "./constants";
import { sortFilmography } from "./credits";
import type {
  AwardTotals,
  FilmographyGroup,
  FilmographySort,
  GalleryTab,
  PersonBioData,
  PersonViewKey,
  PersonViewState,
} from "./types";
import { isFilmographySort, shelves } from "./utils";

const PersonViewContext = createContext<PersonViewState | null>(null);

export function PersonViewProvider({
  awards,
  children,
  hasTimeline,
}: {
  awards: Promise<Awards | null>;
  children: ReactNode;
  hasTimeline: boolean;
}) {
  const [view, setView] = useState<PersonViewKey>("main");
  const [focusYear, setFocusYear] = useState<number | null>(null);
  const [totals, setTotals] = useState<AwardTotals | null>(null);

  useEffect(() => {
    let current = true;
    void awards.then((resolved) => {
      if (!current) return;
      setTotals(
        resolved && resolved.organizations.length > 0
          ? { nominations: resolved.nominations, wins: resolved.wins }
          : null,
      );
    });
    return () => {
      current = false;
    };
  }, [awards]);

  const toggle = useCallback((target: Exclude<PersonViewKey, "main">) => {
    setFocusYear(null);
    setView((current) => (current === target ? "main" : target));
  }, []);
  const openTimeline = useCallback((year: number) => {
    setFocusYear(year);
    setView("timeline");
  }, []);

  const value = useMemo(
    () => ({
      awards: totals,
      focusYear,
      hasTimeline,
      openTimeline,
      toggle,
      view,
    }),
    [focusYear, hasTimeline, openTimeline, toggle, totals, view],
  );
  return <PersonViewContext value={value}>{children}</PersonViewContext>;
}

export function usePersonView(): PersonViewState {
  const state = use(PersonViewContext);
  if (!state) {
    throw new Error("usePersonView needs a PersonViewProvider above it");
  }
  return state;
}

export function PersonViews({
  views,
}: {
  views: Record<PersonViewKey, ReactNode>;
}) {
  const { focusYear, view } = usePersonView();

  return (
    <DetailViews
      focus={focusYear === null ? null : `[data-year="${focusYear}"]`}
      shown={view}
      views={views}
    />
  );
}

export function PersonViewActions(): JSX.Element | null {
  const { awards, hasTimeline, toggle, view } = usePersonView();
  const shown = VIEW_ACTIONS.filter(({ key }) =>
    key === "timeline" ? hasTimeline : awards !== null,
  );
  if (shown.length === 0) return null;

  return (
    <div className="flex gap-3">
      {shown.map(({ icon, key, label }) => (
        <DetailAction
          active={view === key}
          grow
          hoverLabel={view === key ? "Back" : undefined}
          icon={icon}
          key={key}
          label={label}
          onClick={() => toggle(key)}
        />
      ))}
    </div>
  );
}

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

export function PersonGallery({
  backdrops,
  name,
  portraits,
}: {
  backdrops: string[];
  name: string;
  portraits: PersonImage[];
}) {
  const [openImage] = useModal(ImageModal);
  const lead = useLead();
  useEffect(() => () => lead(null), [lead]);
  const tabs = shelves(backdrops, portraits);
  const [tab, setTab] = useState<GalleryTab>(tabs[0]?.[0] ?? "portraits");
  if (tabs.length === 0) return null;

  const [key, paths] = tabs.find(([item]) => item === tab) ?? tabs[0];
  const view = GALLERY_VIEWS[key];
  const portrait = key === "portraits";

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          <div className="flex items-center gap-2">
            {tabs.length > 1 ? (
              <SegmentedControl
                ariaLabel="Gallery images"
                className={TONE.tabs}
                items={tabs.map(([item]) => ({
                  key: item,
                  label: GALLERY_VIEWS[item].label,
                }))}
                onChange={setTab}
                value={key}
              />
            ) : null}
            <WallButton set={key} />
          </div>
        }
        icon="solar:gallery-wide-bold"
        title="Gallery"
      />
      <DetailSwap cue="slides" id={key}>
        <div
          onPointerLeave={() => lead(null)}
          onPointerOver={(event) => {
            if (event.pointerType !== "mouse") return;
            const card = (event.target as Element).closest("[data-still]");
            const still = card?.getAttribute("data-still");
            lead(
              still
                ? portrait
                  ? tmdbImageUrl("profile", still, "w185")
                  : tmdbImageUrl("backdrop", still, "w300")
                : null,
            );
          }}
        >
          <Carousel
            arrowClassName={TONE.arrows}
            className="rounded-card"
            itemClassName={
              !portrait && paths.length === 1 ? "w-full" : view.item
            }
            label={view.label}
            part="slide"
          >
            {paths.map((path, index) => {
              const full = portrait
                ? tmdbImageUrl("profile", path, "original")
                : tmdbImageUrl("backdrop", path, "original");
              return (
                <MediaCard
                  key={path}
                  {...artworkTarget(portrait ? "poster" : "backdrop", path)}
                  aspect={view.aspect}
                  data-still={path}
                  image={{ sizes: view.sizes, src: full }}
                  label={`View ${view.noun} ${index + 1} of ${name}`}
                  radius={RADIUS.card}
                  onClick={() => {
                    if (!full) return;
                    const data: ImageModalData = {
                      alt: `${view.noun[0].toUpperCase()}${view.noun.slice(1)} ${index + 1} of ${name}`,
                      src: full,
                    };
                    void openImage(data);
                  }}
                />
              );
            })}
          </Carousel>
        </div>
      </DetailSwap>
    </DetailSection>
  );
}

export function PersonGalleryWall({
  backdrops,
  name,
  portraits,
}: {
  backdrops: string[];
  name: string;
  portraits: PersonImage[];
}) {
  const sets: WallSet[] = shelves(backdrops, portraits).map(([key, paths]) => {
    const view = GALLERY_VIEWS[key];
    const portrait = key === "portraits";
    return {
      aspect: view.aspect,
      key,
      label: view.label,
      noun: view.noun,
      pictures: paths.map((path) =>
        portrait
          ? {
              full: tmdbImageUrl("profile", path, "original"),
              lead: tmdbImageUrl("profile", path, "w185"),
              path,
              sizes: WALL_SIZES.poster,
              src: tmdbImageUrl("profile", path, "h632"),
            }
          : {
              crossOrigin: "anonymous" as const,
              full: tmdbImageUrl("backdrop", path, "original"),
              lead: tmdbImageUrl("backdrop", path, "w300"),
              path,
              sizes: WALL_SIZES.video,
              src: tmdbImageUrl("backdrop", path, "w780"),
              srcSet:
                tmdbImageSrcSet("backdrop", path, ["w300", "w780"]) ??
                undefined,
            },
      ),
      slot: portrait ? "poster" : "backdrop",
    };
  });
  return <GalleryWall back={`Back to ${name}`} sets={sets} title={name} />;
}

export function createPersonBioSurfaceEntry(data: PersonBioData): SurfaceEntry {
  return {
    component: PersonBioSurface,
    description: data.name,
    icon: "solar:document-text-bold",
    props: { data },
    title: "Biography",
    width: BIO_SURFACE_WIDTH,
  };
}

function PersonBioSurface({ data }: { data: PersonBioData }): JSX.Element {
  return (
    <SurfaceStage className="flex flex-col">
      <SurfacePart name="item">
        <SurfaceProse text={data.biography} />
      </SurfacePart>
    </SurfaceStage>
  );
}
