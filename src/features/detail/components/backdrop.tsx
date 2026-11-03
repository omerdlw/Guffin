"use client";

import { useState, type ReactNode } from "react";
import { Projection } from "@/motion/effects";
import { CURVE, clamp, marqueePatience, step } from "@/motion/engine";
import { BOTTOM_COVER, SIDE_COVER } from "@/ui/backdrop-hero";
import { DetailMarquee, DetailPart } from "../motion";

// The projection goes out of focus over the first screen of scroll.
const DEFOCUS_FROM = 24;
const DEFOCUS_TO = 560;

const defocusAt = (y: number) =>
  CURVE.glide(clamp((y - DEFOCUS_FROM) / (DEFOCUS_TO - DEFOCUS_FROM), 0, 1));

// A cut between two pictures takes the rung a plate settles on, less two.
const CUT_RUNG = 2;
const HALATION = 0.55;

// Where the picture rests on its frame: the title card's picture sits the same.
const POSITION = "center 20%";
const FOCUS = [0.5, 0.2] as const;
const EDGES = { bottom: BOTTOM_COVER, side: SIDE_COVER };

// The card only shows its picture, never larger than the screen, so it takes
// the light copy: the original is the projector's.
const CARD_SIZE = "/t/p/w1280/";
const lighter = (src: string) => src.replace(/\/t\/p\/original\//, CARD_SIZE);

// The page's picture, projected behind the title. The opening waits for it.
// A still can be cut in over it; what is laid over the picture comes as
// children. Any page whose score casts a `backdrop` projects with it; the
// front page does. With a `title` the page opens on a card: the name in the
// middle of the room, cut out of this same picture (`Marquee`).
export function DetailBackdrop({
  children,
  src,
  still = null,
  title,
}: {
  children?: ReactNode;
  src: string;
  still?: string | null;
  title?: string;
}) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative">
      <DetailPart
        name="backdrop"
        patience={title ? marqueePatience() : undefined}
        ready={ready}
      >
        <div className="relative">
          <Projection
            cut={step(CUT_RUNG)}
            defocusAt={defocusAt}
            halation={HALATION}
            onReady={() => setReady(true)}
            position={POSITION}
            reel={still}
            src={src}
          />
        </div>
      </DetailPart>
      {title ? (
        <DetailMarquee
          className="font-zuume"
          edges={EDGES}
          focus={FOCUS}
          part="marquee"
          quiet={ready}
          src={lighter(src)}
          text={title}
        />
      ) : null}
      {children}
    </div>
  );
}
