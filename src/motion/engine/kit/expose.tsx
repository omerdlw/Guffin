"use client";

import { useCallback, useRef, type ElementType } from "react";
import { CURVE } from "../curve";
import { step } from "../ladder";
import { useAnyStage, useEngine, usePartOf } from "../react";
import { Value } from "../value";

// Text printed by light. A band of light crosses the line; behind it the
// print is left, ahead of it nothing yet. Leaving burns it the same way:
// the band crosses again and takes the print with it.

const EDGE = 24;
const BAND = 34;
const GLINT = 0.55;
const LIGHT = "rgb(255 253 247)";

// A hover replays the band once, quicker and fainter, over a finished print.
export const GLINT_RUNG = 1;

export function setMask(el: HTMLElement, image: string) {
  el.style.setProperty("mask-image", image);
  el.style.setProperty("-webkit-mask-image", image);
}

export function clearMask(el: HTMLElement) {
  el.style.removeProperty("mask-image");
  el.style.removeProperty("-webkit-mask-image");
}

const edgeAt = (p: number, linear: boolean) =>
  (100 + EDGE) * (linear ? p : CURVE.silk(p));

function shine(light: HTMLElement, edge: number, level: number) {
  setMask(
    light,
    `linear-gradient(90deg, transparent ${edge - BAND}%, #000 ${edge - EDGE * 0.4}%, transparent ${edge + 3}%)`,
  );
  light.style.opacity = level.toFixed(3);
}

export interface Exposure {
  print: HTMLElement;
  light: HTMLElement;
}

// Places the band: `progress` 0…1 prints, `burn` 0…1 takes the print away.
export function expose(
  { print, light }: Exposure,
  progress: number,
  { burn = 0, linear = false }: { burn?: number; linear?: boolean } = {},
) {
  if (burn > 0) {
    if (burn >= 1) {
      print.style.opacity = "0";
      light.style.opacity = "0";
      return;
    }
    const edge = edgeAt(burn, linear);
    setMask(
      print,
      `linear-gradient(90deg, transparent ${edge - EDGE}%, #000 ${edge}%)`,
    );
    print.style.opacity = "1";
    shine(light, edge, Math.sin(Math.PI * burn) ** 0.6);
    return;
  }
  if (progress <= 0) {
    clearMask(print);
    print.style.opacity = "0";
    light.style.opacity = "0";
    return;
  }
  if (progress >= 1) {
    clearMask(print);
    print.style.opacity = "1";
    light.style.opacity = "0";
    return;
  }
  const edge = edgeAt(progress, linear);
  setMask(
    print,
    `linear-gradient(90deg, #000 ${edge - EDGE}%, transparent ${edge}%)`,
  );
  print.style.opacity = "1";
  shine(light, edge, Math.sin(Math.PI * progress) ** 0.6);
}

export function useExposure() {
  const layers = useRef<Partial<Exposure>>({});
  const print = useCallback((el: HTMLElement | null) => {
    layers.current.print = el ?? undefined;
  }, []);
  const light = useCallback((el: HTMLElement | null) => {
    layers.current.light = el ?? undefined;
  }, []);
  const get = () => {
    const { print, light } = layers.current;
    return print && light ? { print, light } : null;
  };
  return { print, light, get };
}

export function ExposureLayers({
  text,
  print,
  light,
  truncate = false,
}: {
  text: string;
  print: (el: HTMLElement | null) => void;
  light: (el: HTMLElement | null) => void;
  truncate?: boolean;
}) {
  return (
    <>
      <span data-print="" ref={print} style={{ opacity: 0 }}>
        {text}
      </span>
      <span
        aria-hidden="true"
        className={truncate ? "truncate" : undefined}
        ref={light}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          pointerEvents: "none",
          userSelect: "none",
          color: LIGHT,
        }}
      >
        {text}
      </span>
    </>
  );
}

export interface ExposeProps {
  part: string;
  text: string;
  index?: number;
  as?: ElementType;
  className?: string;
  hover?: boolean;
  truncate?: boolean;
}

// A part printed by the band: the band's pace is the part's own arrival.
export function Expose({
  part,
  text,
  index,
  as: Tag = "span",
  className,
  hover = false,
  truncate = false,
}: ExposeProps) {
  const stage = useAnyStage();
  const engine = useEngine();
  const layers = useExposure();
  const printed = useRef(false);
  const glint = useRef<Value | null>(null);

  // The band is the whole movement, so the part's own verbs are not written.
  const props = usePartOf(stage, part, {
    index,
    render: (_look, state) => {
      const exposure = layers.get();
      if (!exposure || glint.current?.moving) return;
      const progress = state.quiet ? (state.enter > 0 ? 1 : 0) : state.enter;
      printed.current = progress >= 1 && state.leave === 0;
      expose(exposure, progress, { burn: state.quiet ? 0 : state.leave });
    },
  });

  const replay = () => {
    const exposure = layers.get();
    if (!hover || !exposure || !printed.current || engine.reduced.get()) return;
    if (glint.current?.moving) return;
    const value = (glint.current ??= new Value(engine.clock));
    value.set(0);
    const stop = value.subscribe((p) => {
      shine(exposure.light, edgeAt(p, false), Math.sin(Math.PI * p) * GLINT);
    });
    void value
      .to(1, { tween: step(GLINT_RUNG), curve: CURVE.linear })
      .then(() => {
        stop();
        exposure.light.style.opacity = "0";
      });
  };

  return (
    <Tag
      {...props}
      className={className}
      onPointerEnter={hover ? replay : undefined}
      style={{
        ...props.style,
        position: "relative",
        display: Tag === "span" ? "inline-block" : undefined,
      }}
    >
      <ExposureLayers
        text={text}
        print={layers.print}
        light={layers.light}
        truncate={truncate}
      />
    </Tag>
  );
}
