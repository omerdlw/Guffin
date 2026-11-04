"use client";

import { useEffect, useState } from "react";
import { defineModal, useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkAttributes } from "@/features/artwork/utils";
import { WALL_SIZES } from "@/features/detail/constants";
import { GalleryWall, ImageModal, WallButton } from "@/features/detail/gallery";
import { Heading } from "@/features/detail/layout";
import { DetailSection, DetailSwap } from "@/features/detail/motion";
import { useLead } from "@/features/detail/stage";
import type { ImageModalData, WallSet } from "@/features/detail/types";
import {
  type MovieImage,
  type MovieVideo,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { useShowing } from "@/motion/kit";
import { Tube } from "@/motion/screen";
import { SegmentedControl } from "@/ui/form";
import { Carousel, Icon, MediaCard } from "@/ui/media";
import { CAROUSEL_WIDE_ITEM, RADIUS, TONE } from "@/ui/tokens";
import {
  GALLERY_REACH_STEP,
  GALLERY_TAB_ORDER,
  GALLERY_TABS,
} from "./constants";
import type { CastModalProps, GalleryTab, VideoModalData } from "./types";
import { galleryOriginal, pluralizeVideoType, thumbnailFor } from "./utils";

function VideoModalView({ data }: CastModalProps<VideoModalData>) {
  useShowing();
  return (
    <Tube className="aspect-video w-[min(92vw,64rem)] overflow-hidden rounded-sheet bg-black ring-1 ring-edge-hover ring-inset">
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.key)}?autoplay=1&rel=0`}
        title={data.name}
      />
    </Tube>
  );
}

const VideoModal = defineModal({
  chrome: "bare",
  component: VideoModalView,
  position: "center",
});

export function MovieGallery({
  backdrops,
  posters,
  title,
}: {
  backdrops: MovieImage[];
  posters: MovieImage[];
  title: string;
}) {
  const [openImage] = useModal(ImageModal);
  const lead = useLead();
  useEffect(() => () => lead(null), [lead]);
  const sets: Record<GalleryTab, MovieImage[]> = { backdrops, posters };
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
    const data: ImageModalData = {
      alt: `${view.noun[0].toUpperCase()}${view.noun.slice(1)} ${index + 1} of ${title}`,
      src: full,
    };
    void openImage(data);
  };

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          <div className="flex items-center gap-2">
            {available.length > 1 ? (
              <SegmentedControl
                ariaLabel="Gallery images"
                className={TONE.tabs}
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
      <DetailSwap cue="slides" id={key}>
        <div
          onPointerLeave={() => lead(null)}
          onPointerOver={(event) => {
            if (event.pointerType !== "mouse") return;
            const card = (event.target as Element).closest("[data-still]");
            const still = card?.getAttribute("data-still");
            const slot = key === "backdrops" ? "backdrop" : "poster";
            lead(still ? tmdbImageUrl(slot, still, "w300") : null);
          }}
        >
          <Carousel
            arrowClassName={TONE.arrows}
            className="rounded-card"
            itemClassName={
              key === "backdrops" && total === 1 ? "w-full" : view.item
            }
            label={view.label}
            onNearEnd={more}
            part="slide"
          >
            {images.map((image, index) => {
              const label = `View ${view.noun} ${index + 1} of ${title}`;
              const shown = thumbnailFor("gallery", key, image.filePath);
              return (
                <MediaCard
                  key={image.filePath}
                  {...artworkAttributes(
                    key === "backdrops" ? "backdrop" : "poster",
                    image.filePath,
                  )}
                  aspect={view.aspect}
                  data-still={image.filePath}
                  image={{
                    crossOrigin: shown.crossOrigin,
                    sizes: view.sizes,
                    src: shown.src,
                    srcSet: shown.srcSet,
                  }}
                  label={label}
                  onClick={() => open(image.filePath, index)}
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
  backdrops: MovieImage[];
  posters: MovieImage[];
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
        pictures: images.map((image) => {
          const shown = thumbnailFor("wall", key, image.filePath);
          return {
            crossOrigin: shown.crossOrigin,
            full: galleryOriginal(key, image.filePath),
            lead: tmdbImageUrl(slot, image.filePath, "w300"),
            path: image.filePath,
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
            className={TONE.tabs}
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
          className="rounded-card"
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
                const data: VideoModalData = {
                  key: video.key,
                  name: video.name,
                };
                void openVideo(data);
              }}
              overlay={
                <>
                  <div className="cine-play center pointer-events-none absolute inset-0 text-ink">
                    <Icon icon="solar:play-circle-bold" size={48} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
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
