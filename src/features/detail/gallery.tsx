"use client";

import { useEffect, useRef, useState } from "react";
import { defineModal, useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkAttributes } from "@/features/artwork/utils";
import { useWall } from "@/motion/wall";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/feedback";
import { SegmentedControl } from "@/ui/form";
import { Icon, MediaCard } from "@/ui/media";
import { RADIUS, TONE } from "@/ui/tokens";
import {
  MEDIA_GRID_CLASS,
  WALL_CONTROL_CLASS,
  WALL_REACH_STEP,
} from "./constants";
import { Heading } from "./layout";
import { DetailPart, DetailSection, DetailSwap } from "./motion";
import { useLead, useWallSet } from "./stage";
import type { ImageModalData, ModalProps, WallPicture, WallSet } from "./types";

function ImageModalView({ data }: ModalProps<ImageModalData>) {
  return (
    <img
      alt={data.alt}
      className="max-h-[85vh] max-w-[92vw] rounded-sheet object-contain ring-1 ring-edge-hover"
      draggable={false}
      src={data.src}
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
      <button
        aria-label="See the whole gallery"
        className={cn(WALL_CONTROL_CLASS, "w-8")}
        onClick={() => {
          choose(set);
          wall.open(button.current?.closest("section") ?? null);
        }}
        ref={button}
        type="button"
      >
        <Icon icon="solar:widget-4-linear" size={16} />
      </button>
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
                  className={TONE.tabs}
                  items={sets.map((item) => ({
                    key: item.key,
                    label: `${item.label} ${item.pictures.length}`,
                  }))}
                  onChange={choose}
                  value={shown.key}
                />
              ) : null}
              <button
                className={cn(WALL_CONTROL_CLASS, `px-3 ${TONE.label}`)}
                onClick={() => wall?.close()}
                type="button"
              >
                <Icon icon="solar:close-circle-linear" size={14} />
                {back}
              </button>
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
