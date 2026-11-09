"use client";

import { useEffect, useRef, useState } from "react";
import { defineModal, useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkAttributes } from "@/features/artwork/utils";
import { useWall } from "@/motion/wall";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { MediaCard } from "@/design/components/media-card";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Tooltip } from "@/design/components/tooltip";
import { cn } from "@/design/foundations/cn";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { MEDIA_GRID_CLASS, WALL_REACH_STEP } from "./constants";
import { Heading } from "./layout";
import { DetailPart, DetailSection, DetailSwap } from "./motion";
import { useLead, useWallSet } from "./stage";
import type { ImageModalData, ModalProps, WallPicture, WallSet } from "./types";
import { Image } from "@/design/components/image";

function ImageModalView({ data }: ModalProps<ImageModalData>) {
  return (
    <Image
      alt={data.alt}
      className="max-h-[85vh] max-w-[92vw]"
      fit="contain"
      layout="intrinsic"
      priority
      src={data.src}
      wrapperClassName="rounded-sheet ring-1 ring-edge-hover"
    />
  );
}

export const ImageModal = defineModal({
  chrome: "bare",
  component: ImageModalView,
  position: "center",
});

export function WallButton({ set }: { set: string }) {
  const wall = useWall();
  const { choose } = useWallSet();
  const button = useRef<HTMLButtonElement>(null);
  if (!wall) return null;
  return (
    <Tooltip position="top" text="See the whole gallery">
      <Button
        aria-label="See the whole gallery"
        icon
        intent="neutral"
        shape="pill"
        size="sm"
        onClick={() => {
          choose(set);
          wall.open(button.current?.closest("section") ?? null);
        }}
        ref={button}
        type="button"
      >
        <Icon icon="solar:widget-4-linear" size={16} />
      </Button>
    </Tooltip>
  );
}

function useWallReach(total: number) {
  const [reach, setReach] = useState(WALL_REACH_STEP);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || reach >= total) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setReach((count) => count + WALL_REACH_STEP);
      },
      { rootMargin: "0px 0px 100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reach, total]);

  return { reach, resetReach: () => setReach(WALL_REACH_STEP), sentinel };
}

export function GalleryWall({
  back,
  sets,
  title,
}: {
  back: string;
  sets: WallSet[];
  title: string;
}) {
  const wall = useWall();
  const lead = useLead();
  const { set } = useWallSet();
  const [openImage] = useModal(ImageModal);
  const [chosenKey, setChosenKey] = useState(set ?? sets[0]?.key);
  const shown = sets.find((item) => item.key === chosenKey) ?? sets[0];
  const { reach, resetReach, sentinel } = useWallReach(
    shown?.pictures.length ?? 0,
  );

  useEffect(() => () => lead(null), [lead]);

  if (!shown) return null;

  const choose = (key: string) => {
    setChosenKey(key);
    resetReach();
  };

  const open = (picture: WallPicture, index: number) => {
    if (!picture.full) return;
    const data: ImageModalData = {
      alt: `${shown.noun[0].toUpperCase()}${shown.noun.slice(1)} ${index + 1} of ${title}`,
      src: picture.full,
    };
    void openImage(data);
  };

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <DetailSection className="flex w-full flex-col" cue="wall">
        <Heading
          actions={
            <div className="flex items-center gap-2">
              {sets.length > 1 ? (
                <SegmentedControl
                  ariaLabel="Gallery images"
                  items={sets.map((item) => ({
                    key: item.key,
                    label: `${item.label} ${item.pictures.length}`,
                  }))}
                  onChange={choose}
                  value={shown.key}
                />
              ) : null}
              <Button
                className={TONE.label}
                intent="neutral"
                onClick={() => wall?.close()}
                shape="pill"
                size="sm"
              >
                <Icon icon="solar:close-circle-linear" size={14} />
                {back}
              </Button>
            </div>
          }
          icon="solar:gallery-wide-bold"
          title={`${title} · Gallery`}
        />
        <DetailSwap
          className={cn("grid gap-3", MEDIA_GRID_CLASS[shown.aspect])}
          cue="tiles"
          id={shown.key}
        >
          <div
            className="contents"
            onPointerLeave={() => lead(null)}
            onPointerOver={(event) => {
              if (event.pointerType !== "mouse") return;
              const card = (event.target as Element).closest("[data-still]");
              const index = Number(card?.getAttribute("data-still"));
              const picture = Number.isInteger(index)
                ? shown.pictures[index]
                : undefined;
              lead(picture?.lead ?? null);
            }}
          >
            {shown.pictures.slice(0, reach).map((picture, index) => (
              <div
                className="overflow-hidden"
                key={picture.path}
                style={{ borderRadius: RADIUS.card }}
              >
                <DetailPart index={index} name="tile">
                  <MediaCard
                    {...artworkAttributes(shown.slot, picture.path)}
                    aspect={shown.aspect}
                    data-still={String(index)}
                    image={{
                      crossOrigin: picture.crossOrigin,
                      sizes: picture.sizes,
                      src: picture.src,
                      srcSet: picture.srcSet,
                    }}
                    label={`View ${shown.noun} ${index + 1} of ${title}`}
                    onClick={() => open(picture, index)}
                    radius={RADIUS.card}
                  />
                </DetailPart>
              </div>
            ))}
          </div>
        </DetailSwap>
        <div aria-hidden="true" className="h-px" ref={sentinel} />
      </DetailSection>
    </div>
  );
}
