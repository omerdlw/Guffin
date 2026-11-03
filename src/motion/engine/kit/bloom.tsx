"use client";

import type { ElementType } from "react";
import { CURVE, elapsed } from "../curve";
import { clamp, haze } from "../ladder";
import { useAnyStage, usePartOf } from "../react";
import { clearMask, setMask, useExposure, type Exposure } from "./expose";

// A name that blooms: light crosses it from left to right, and what the light
// has passed is still out of focus. The glow is the lens's own, the pool that
// lights a bright patch of the backdrop, and the focus pulls in slowly behind
// it, so the name is first lit and only then read.
//
// The part's arrival is the clock, as in `Header`: the sweep and the focus are
// two windows of it, and the focus outlasts the sweep. The part is cast in
// `ink`, whose curve is silk. Cast the part with
// `enter: "still"` so only the light and the focus move, while leaving and
// depth still apply.

// Where each plays in the arrival, as shares of it (0 → 1).
const SWEEP = [0, 0.62] as const;
const FOCUS = [0.1, 1] as const;

// How far behind the edge the print is fully there, and how wide the glow is,
// in % of the line.
const EDGE = 30;
const BAND = 46;

// The name's softness when it is first lit, in blur rungs, and the glow's.
const SOFT_RUNG = 5;
const GLOW_RUNG = 2;

// A mask clips what it masks to the layer's box, and blur and glow spill
// past a line's tight box, so a bare layer would show the spill cut off as a
// hard rectangle. Each layer is given room all round (and takes it back in
// its margin), so the soft edge of the text stays soft.
const ROOM = "0.6em";

const LIGHT = "rgb(255 253 247)";
const GLOW =
  "0 0 0.3em rgb(150 190 255 / 0.8), 0 0 0.9em rgb(110 160 255 / 0.5)";

const within = (progress: number, [from, to]: readonly [number, number]) =>
  clamp((progress - from) / (to - from), 0, 1);

function bloom({ print, light }: Exposure, progress: number) {
  if (progress <= 0) {
    clearMask(print);
    print.style.opacity = "0";
    print.style.removeProperty("filter");
    light.style.opacity = "0";
    return;
  }
  if (progress >= 1) {
    clearMask(print);
    print.style.opacity = "1";
    print.style.removeProperty("filter");
    clearMask(light);
    light.style.opacity = "0";
    light.style.removeProperty("filter");
    return;
  }
  const time = elapsed(CURVE.silk, progress);
  const sweep = CURVE.glide(within(time, SWEEP));
  const focus = CURVE.silk(within(time, FOCUS));
  const edge = (100 + EDGE) * sweep;

  setMask(
    print,
    `linear-gradient(90deg, #000 ${edge - EDGE}%, transparent ${edge}%)`,
  );
  print.style.opacity = "1";
  print.style.filter = `blur(${((1 - focus) * haze(SOFT_RUNG)).toFixed(2)}px)`;

  setMask(
    light,
    `linear-gradient(90deg, transparent ${edge - BAND}%, #000 ${edge - EDGE * 0.4}%, transparent ${edge + 3}%)`,
  );
  light.style.opacity = (
    sweep <= 0 || sweep >= 1 ? 0 : Math.sin(Math.PI * sweep) ** 0.6
  ).toFixed(3);
  light.style.filter = `blur(${((1 - focus) * haze(GLOW_RUNG)).toFixed(2)}px)`;
}

export interface BloomProps {
  part: string;
  text: string;
  as?: ElementType;
  className?: string;
}

export function Bloom({ part, text, as: Tag = "span", className }: BloomProps) {
  const stage = useAnyStage();
  const { get, print, light } = useExposure();

  const props = usePartOf(stage, part, {
    css: true,
    render: (_look, state) => {
      const exposure = get();
      if (!exposure) return;
      const progress = state.quiet ? (state.enter > 0 ? 1 : 0) : state.enter;
      bloom(exposure, progress);
    },
  });

  return (
    <Tag
      {...props}
      className={className}
      style={{ ...props.style, position: "relative" }}
    >
      <span
        data-print=""
        ref={print}
        style={{
          display: "block",
          margin: `-${ROOM}`,
          opacity: 0,
          padding: ROOM,
        }}
      >
        {text}
      </span>
      <span
        aria-hidden="true"
        ref={light}
        style={{
          position: "absolute",
          inset: `-${ROOM}`,
          display: "block",
          padding: ROOM,
          opacity: 0,
          pointerEvents: "none",
          userSelect: "none",
          color: LIGHT,
          textShadow: GLOW,
        }}
      >
        {text}
      </span>
    </Tag>
  );
}
