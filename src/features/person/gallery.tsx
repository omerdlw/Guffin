"use client";

import { useState } from "react";
import { useModal } from "@omerdlw/base-framework/modal";
import { SegmentedControl } from "@omerdlw/base-framework/ui";
import { Carousel } from "@/design/components/carousel";
import {
  MediaCard,
  type MediaCardAspect,
} from "@/design/components/media-card";
import { RADIUS } from "@/design/foundations/geometry";
import { CAROUSEL_ITEM, CAROUSEL_WIDE_ITEM } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { artworkAttributes } from "@/features/artwork/store";
import {
  type ImageModalData,
  WALL_SIZES,
  type WallSet,
} from "@/features/detail/detail";
import { GalleryWall, WallButton } from "@/features/detail/gallery";
import { ImageModal } from "@/features/detail/image-modal";
import { Heading } from "@/features/detail/layout";
import { DetailSection, DetailSwap } from "@/features/detail/motion";
import {
  type PersonImage,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";

type GalleryTab = "portraits" | "backdrops";

interface GalleryView {
  aspect: MediaCardAspect;
  item: string;
  label: string;
  noun: string;
  sizes: string;
}

const GALLERY_VIEWS: Record<GalleryTab, GalleryView> = {
  portraits: {
    aspect: "poster",
    item: CAROUSEL_ITEM,
    label: "Portraits",
    noun: "portrait",
    sizes: "(min-width: 768px) 160px, 30vw",
  },
  backdrops: {
    aspect: "video",
    item: CAROUSEL_WIDE_ITEM,
    label: "Backdrops",
    noun: "scene",
    sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
  },
};

const buildGalleryShelves = (
  backdrops: string[],
  portraits: PersonImage[],
): [GalleryTab, string[]][] =>
  (
    [
      [
        "portraits",
        portraits.length > 1 ? portraits.map((p) => p.filePath) : [],
      ],
      ["backdrops", backdrops],
    ] as [GalleryTab, string[]][]
  ).filter(([, paths]) => paths.length > 0);

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
        <div>
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
                path,
                sizes: WALL_SIZES.poster,
                src: tmdbImageUrl("profile", path, "h632"),
              }
            : {
                crossOrigin: "anonymous" as const,
                full: tmdbImageUrl("backdrop", path, "original"),
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
