"use client";

import { useState, type ReactNode } from "react";
import { Projection } from "@/motion/effects";
import { CURVE, clamp, step } from "@/motion/engine";
import { DetailPart } from "../motion";

// The projection goes out of focus over the first screen of scroll.
const DEFOCUS_FROM = 24;
const DEFOCUS_TO = 560;

const defocusAt = (y: number) =>
  CURVE.glide(clamp((y - DEFOCUS_FROM) / (DEFOCUS_TO - DEFOCUS_FROM), 0, 1));

// A cut between two pictures takes the rung a plate settles on, less two.
const CUT_RUNG = 2;
const HALATION = 0.55;

// The page's picture, projected behind the title. The opening waits for it.
// A still can be cut in over it; what is laid over the picture comes as
// children. Any page whose score casts a `backdrop` projects with it; the
// front page does.
export function DetailBackdrop({
  children,
  src,
  still = null,
}: {
  children?: ReactNode;
  src: string;
  still?: string | null;
}) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative">
      <DetailPart name="backdrop" ready={ready}>
        <div className="relative">
          <Projection
            cut={step(CUT_RUNG)}
            defocusAt={defocusAt}
            halation={HALATION}
            onReady={() => setReady(true)}
            position="center 20%"
            reel={still}
            src={src}
          />
        </div>
      </DetailPart>
      {children}
    </div>
  );
}
