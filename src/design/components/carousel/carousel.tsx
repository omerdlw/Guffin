"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";
import {
  Carousel as UiCarousel,
  type CarouselGlide,
} from "@omerdlw/base-framework/design";
import { Value } from "@/motion/engine";
import { StagePart, useEngine } from "@/motion/react";
import { CURVE } from "@/motion/time";
import { step } from "@/motion/utils";
import { cn } from "../../foundations/cn";
import styles from "./carousel.module.css";

const GLIDE_RUNG = 2;

const TRACK = { "data-cursor": "drag" } as const;

export interface CarouselProps {
  part: string;
  children: ReactNode;
  arrowClassName?: string;
  className?: string;
  itemClassName?: string;
  label?: string;
  onNearEnd?: () => void;
}

export function Carousel({
  part,
  arrowClassName,
  className,
  itemClassName,
  ...props
}: CarouselProps) {
  const engine = useEngine();
  const glideValue = useRef<Value | null>(null);
  const [settled, setSettled] = useState(false);
  const settledRef = useRef(false);

  const glide = useCallback<CarouselGlide>(
    (track, target) => {
      if (engine.reduced.get()) {
        track.scrollLeft = target;
        return;
      }
      const value = (glideValue.current ??= new Value(engine.clock));
      value.stop();
      value.set(track.scrollLeft);
      const stop = value.subscribe((left) => {
        track.scrollLeft = left;
      });
      void value
        .to(target, { tween: step(GLIDE_RUNG), curve: CURVE.dolly })
        .then(stop);
      return () => value.stop();
    },
    [engine],
  );

  const onSlide = (index: number) =>
    index === 0
      ? (_look: unknown, state: { enter: number }) => {
          if (settledRef.current || state.enter < 1) return;
          settledRef.current = true;
          setSettled(true);
        }
      : undefined;

  return (
    <UiCarousel
      {...props}
      className={className}
      classNames={{
        arrow: arrowClassName,
        slide: cn(styles.slide, itemClassName),
      }}
      frameSelector="[data-cursor-frame]"
      glide={glide}
      ready={settled}
      trackProps={TRACK}
      renderSlide={({ children, className: slideClass, index }) => (
        <StagePart
          className={slideClass}
          css
          index={index}
          name={part}
          render={onSlide(index)}
        >
          {children}
        </StagePart>
      )}
    />
  );
}
