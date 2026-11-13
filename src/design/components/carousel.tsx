"use client";

import type { ReactNode } from "react";
import {
  Carousel as UiCarousel,
  type CarouselGlide,
} from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import { Part } from "@/motion/stage";
import styles from "./carousel.module.css";

const TRACK = { "data-cursor": "drag" } as const;

const glide: CarouselGlide = (track, target) => {
  track.scrollLeft = target;
};

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
      ready
      trackProps={TRACK}
      renderSlide={({ children, className: slideClass, index }) => (
        <Part className={slideClass} index={index} name={part}>
          {children}
        </Part>
      )}
    />
  );
}
