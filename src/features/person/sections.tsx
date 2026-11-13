"use client";

import { type JSX, useEffect, useMemo, useState } from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/dock";
import { useModal } from "@omerdlw/base-framework/modal";
import { artworkAttributes } from "@/features/artwork/utils";
import { WALL_SIZES } from "@/features/detail/constants";
import { Heading } from "@/features/detail/layout";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import { GalleryWall, ImageModal, WallButton } from "@/features/detail/gallery";
import { useLead } from "@/features/detail/stage";
import type { ImageModalData, WallSet } from "@/features/detail/types";
import { MoviePosterLink } from "@/features/movie/stage";
import {
  type PersonImage,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { Button, SegmentedControl } from "@omerdlw/base-framework/ui";
import { Carousel } from "@/design/components/carousel";
import { MediaCard } from "@/design/components/media-card";
import { Select } from "@/design/components/select";
import { SurfacePart, SurfaceStage } from "@/design/components/surface";
import { SurfaceProse } from "@/design/components/surface-prose";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import {
  BIO_SURFACE_WIDTH,
  FILMOGRAPHY_GRID_CLASS,
  GALLERY_VIEWS,
  PERSON_DEFAULT_SORT,
  PERSON_FILMOGRAPHY_PREVIEW,
  SORT_OPTIONS,
} from "./constants";
import { sortFilmography } from "./credits";
import type {
  ByMedium,
  FilmographyGroup,
  FilmographySort,
  GalleryTab,
  PersonBioData,
} from "./types";
import { buildGalleryShelves, isFilmographySort } from "./utils";
import { PersonMediumControl, usePersonMedium } from "./views";

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
  const tabs = buildGalleryShelves(backdrops, portraits);
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
                  {...artworkAttributes(portrait ? "poster" : "backdrop", path)}
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
  const sets: WallSet[] = buildGalleryShelves(backdrops, portraits).map(
    ([key, paths]) => {
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
    },
  );
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
