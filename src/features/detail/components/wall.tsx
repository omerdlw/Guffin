"use client";

import { useEffect, useRef, useState } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { cn } from "@/ui/cn";
import { artworkTarget } from "@/features/artwork";
import { Icon, MediaCard, RADIUS, SegmentedControl, TONE, Tooltip } from "@/ui";
import { useWall } from "@/motion/engine";
import { DetailPart, DetailSection, DetailSwap } from "../motion";
import { Heading } from "./heading";
import { ImageModal, type ImageModalData } from "./image-modal";
import { useLead, useWallSet } from "./stage";
import { GRID, STRETCH, type WallPicture, type WallSet } from "./wall-set";

// Every picture of the film or the person, hung in front of the page. The
// button names the set the wall opens on; on the wall the sets swap in place,
// and pictures are hung a stretch at a time as the end of the wall comes near.

const CONTROL = `cine-press center h-8 cursor-pointer gap-2 rounded-full ${TONE.surface}`;

export function WallButton({ set }: { set: string }) {
  const wall = useWall();
  const { choose } = useWallSet();
  const button = useRef<HTMLButtonElement>(null);
  if (!wall) return null;
  return (
    <Tooltip position="top" text="See the whole gallery">
      <button
        aria-label="See the whole gallery"
        className={cn(CONTROL, "w-8")}
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
  const [chosen, setChosen] = useState(set ?? sets[0]?.key);
  const [reach, setReach] = useState(STRETCH);
  const end = useRef<HTMLDivElement>(null);
  const shown = sets.find((item) => item.key === chosen) ?? sets[0];
  const total = shown?.pictures.length ?? 0;

  useEffect(() => () => lead(null), [lead]);

  useEffect(() => {
    const element = end.current;
    if (!element || reach >= total) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setReach((count) => count + STRETCH);
      },
      { rootMargin: "0px 0px 100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reach, total]);

  if (!shown) return null;

  const choose = (key: string) => {
    setChosen(key);
    setReach(STRETCH);
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
                className={cn(CONTROL, `px-3 ${TONE.label}`)}
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
          className={cn("grid gap-3", GRID[shown.aspect])}
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
                    {...artworkTarget(shown.slot, picture.path)}
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
        <div aria-hidden="true" className="h-px" ref={end} />
      </DetailSection>
    </div>
  );
}
