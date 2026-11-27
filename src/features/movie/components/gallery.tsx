"use client";

import { useState } from "react";
import { defineModal, useModal } from "@omerdlw/base-framework/modal";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import {
  MediaCard,
  type MediaCardAspect,
} from "@/design/components/media-card";
import { useShowing } from "@/design/components/room";
import { SegmentedControl } from "@/design/components/segmented-control";
import { RADIUS } from "@/design/foundations/geometry";
import { CAROUSEL_ITEM, CAROUSEL_WIDE_ITEM } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { artworkAttributes } from "@/features/artwork/store";
import {
  GalleryWall,
  WallButton,
} from "@/features/detail-page/components/gallery-wall";
import { ImageModal } from "@/features/detail-page/components/image-modal";
import { Heading } from "@/features/detail-page/components/layout";
import { WALL_SIZES, type WallSet } from "@/features/detail-page/model";
import { DetailSection, DetailSwap } from "@/features/detail-page/motion";
import {
  type MovieVideo,
  tmdbImageSrcSet,
  tmdbImageUrl,
} from "@/infrastructure/tmdb/model";
import type { CastModalProps, VideoModalData } from "../model";

function VideoModalView({ data }: CastModalProps<VideoModalData>) {
  useShowing();
  return (
    <div className="aspect-video w-[min(92vw,64rem)] overflow-hidden rounded-sheet bg-page ring-1 ring-edge-hover ring-inset">
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.key)}?autoplay=1&rel=0`}
        title={data.name}
      />
    </div>
  );
}

const VideoModal = defineModal({
  chrome: "bare",
  component: VideoModalView,
  position: "center",
});

type GalleryTab = "backdrops" | "posters";

const GALLERY_TABS: Record<
  GalleryTab,
  {
    aspect: MediaCardAspect;
    item: string;
    label: string;
    noun: string;
    sizes: string;
  }
> = {
  backdrops: {
    aspect: "video",
    item: CAROUSEL_WIDE_ITEM,
    label: "Backdrops",
    noun: "scene",
    sizes: "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
  },
  posters: {
    aspect: "poster",
    item: CAROUSEL_ITEM,
    label: "Posters",
    noun: "poster",
    sizes: "(min-width: 768px) 160px, 30vw",
  },
};

const GALLERY_TAB_ORDER: readonly GalleryTab[] = ["backdrops", "posters"];

const GALLERY_REACH_STEP = 18;

const THUMBNAIL_WIDTHS = {
  gallery: {
    backdrops: ["w300", "w780", "w1280"],
    posters: ["w185", "w342", "w500"],
  },
  wall: {
    backdrops: ["w300", "w780"],
    posters: ["w185", "w342"],
  },
} as const;

function thumbnailFor(
  variant: "gallery" | "wall",
  tab: GalleryTab,
  path: string,
) {
  const widths = THUMBNAIL_WIDTHS[variant];
  if (tab === "backdrops") {
    return {
      crossOrigin: "anonymous" as const,
      src: tmdbImageUrl("backdrop", path, "w780"),
      srcSet: tmdbImageSrcSet("backdrop", path, widths.backdrops) ?? undefined,
    };
  }
  return {
    crossOrigin: undefined,
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, widths.posters) ?? undefined,
  };
}

function galleryOriginal(tab: GalleryTab, path: string) {
  return tab === "backdrops"
    ? tmdbImageUrl("backdrop", path, "original")
    : tmdbImageUrl("poster", path, "original");
}

const pluralizeVideoType = (type: string) =>
  type.endsWith("s") ? type : `${type}s`;

export function MovieGallery({
  backdrops,
  now = false,
  posters,
  title,
}: {
  backdrops: readonly string[];
  now?: boolean;
  posters: readonly string[];
  title: string;
}) {
  const [openImage] = useModal(ImageModal);
  const sets: Record<GalleryTab, readonly string[]> = { backdrops, posters };
  const available = GALLERY_TAB_ORDER.filter((key) => sets[key].length > 0);
  const [shelf, setShelf] = useState<{ reach: number; tab: GalleryTab }>({
    reach: GALLERY_REACH_STEP,
    tab: available[0] ?? "backdrops",
  });
  const key = available.includes(shelf.tab) ? shelf.tab : available[0];
  const total = key ? sets[key].length : 0;
  const more = () =>
    setShelf((current) =>
      current.reach < total
        ? { ...current, reach: current.reach + GALLERY_REACH_STEP }
        : current,
    );
  if (!key) return null;

  const images = sets[key].slice(0, shelf.reach);
  const view = GALLERY_TABS[key];
  const choose = (tab: GalleryTab) =>
    setShelf({ reach: GALLERY_REACH_STEP, tab });

  const open = (path: string, index: number) => {
    const full = galleryOriginal(key, path);
    if (!full) return;
    void openImage({
      alt: `${view.noun[0].toUpperCase()}${view.noun.slice(1)} ${index + 1} of ${title}`,
      src: full,
    });
  };

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf" now={now}>
      <Heading
        actions={
          <div className="flex items-center gap-2">
            {available.length > 1 ? (
              <SegmentedControl
                ariaLabel="Gallery images"
                items={available.map((itemKey) => ({
                  key: itemKey,
                  label: `${GALLERY_TABS[itemKey].label} ${sets[itemKey].length}`,
                }))}
                onChange={choose}
                value={key}
              />
            ) : null}
            <WallButton set={key} />
          </div>
        }
        icon="solar:gallery-wide-bold"
        title="Gallery"
      />
      <DetailSwap cue="slides" id={key} now={now}>
        <div>
          <Carousel
            arrowClassName={TONE.arrows}
            itemClassName={
              key === "backdrops" && total === 1 ? "w-full" : view.item
            }
            label={view.label}
            onNearEnd={more}
            part="slide"
          >
            {images.map((path, index) => {
              const label = `View ${view.noun} ${index + 1} of ${title}`;
              const shown = thumbnailFor("gallery", key, path);
              return (
                <MediaCard
                  key={path}
                  {...artworkAttributes(
                    key === "backdrops" ? "backdrop" : "poster",
                    path,
                  )}
                  aspect={view.aspect}
                  image={{
                    crossOrigin: shown.crossOrigin,
                    sizes: view.sizes,
                    src: shown.src,
                    srcSet: shown.srcSet,
                  }}
                  label={label}
                  onClick={() => open(path, index)}
                  radius={RADIUS.card}
                />
              );
            })}
          </Carousel>
        </div>
      </DetailSwap>
    </DetailSection>
  );
}

export function MovieGalleryWall({
  backdrops,
  posters,
  title,
}: {
  backdrops: readonly string[];
  posters: readonly string[];
  title: string;
}) {
  const sets: WallSet[] = GALLERY_TAB_ORDER.flatMap((key) => {
    const images = key === "backdrops" ? backdrops : posters;
    if (images.length === 0) return [];
    const view = GALLERY_TABS[key];
    const slot = key === "backdrops" ? "backdrop" : "poster";
    return [
      {
        aspect: view.aspect,
        key,
        label: view.label,
        noun: view.noun,
        pictures: images.map((path) => {
          const shown = thumbnailFor("wall", key, path);
          return {
            crossOrigin: shown.crossOrigin,
            full: galleryOriginal(key, path),
            path,
            sizes: key === "backdrops" ? WALL_SIZES.video : WALL_SIZES.poster,
            src: shown.src,
            srcSet: shown.srcSet,
          };
        }),
        slot,
      },
    ];
  });
  return <GalleryWall back="Back to the film" sets={sets} title={title} />;
}

export function MovieVideos({
  types,
  videos,
}: {
  types: string[];
  videos: MovieVideo[];
}) {
  const [openVideo] = useModal(VideoModal);
  const [type, setType] = useState(types[0] ?? "");
  if (types.length === 0) return null;

  const visible = videos.filter((v) => v.site === "YouTube" && v.type === type);

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          <SegmentedControl
            ariaLabel="Video type"
            items={types.map((t) => ({ key: t, label: pluralizeVideoType(t) }))}
            onChange={setType}
            value={type}
          />
        }
        icon="solar:video-frame-play-horizontal-bold"
        title="Videos"
      />

      <DetailSwap cue="slides" id={type}>
        <Carousel
          arrowClassName={TONE.arrows}
          itemClassName={visible.length === 1 ? "w-full" : CAROUSEL_WIDE_ITEM}
          label="Videos"
          part="slide"
        >
          {visible.map((video) => (
            <MediaCard
              key={video.id}
              aspect="video"
              fallbackIcon="solar:video-frame-play-horizontal-bold"
              image={{
                sizes:
                  "(min-width: 1280px) 330px, (min-width: 640px) 50vw, 100vw",
                src: `https://img.youtube.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`,
              }}
              label={`Play ${video.name}`}
              radius={RADIUS.card}
              onClick={() => {
                void openVideo({
                  key: video.key,
                  name: video.name,
                });
              }}
              overlay={
                <>
                  <div className="center pointer-events-none absolute inset-0 text-ink">
                    <Icon icon="solar:play-circle-bold" size={48} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-page/80 to-transparent p-3 text-left">
                    <h3 className="truncate type-body font-semibold text-ink">
                      {video.name}
                    </h3>
                  </div>
                </>
              }
            />
          ))}
        </Carousel>
      </DetailSwap>
    </DetailSection>
  );
}
