"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Carousel as UiCarousel,
  type CarouselGlide,
} from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import { bezier } from "@/motion/curve";
import { useHydratedReducedMotion } from "@/motion/react";
import { Part, useGlide } from "@/motion/stage";
import styles from "./carousel.module.css";

const TRACK = { "data-cursor": "drag" } as const;
const FRAME = "[data-cursor-frame]";

const jump: CarouselGlide = (track, target) => {
  track.scrollLeft = target;
};

// The page decides how a carousel pans (its stage's `glide`); a page without
// one jumps.
function usePan(): CarouselGlide {
  const spec = useGlide();
  const reduced = useHydratedReducedMotion();
  return useMemo(() => {
    if (!spec || reduced) return jump;
    const ease = bezier(...spec.ease);
    const span = spec.duration * 1000;
    return (track, target) => {
      const from = track.scrollLeft;
      const start = performance.now();
      let frame = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / span);
        track.scrollLeft = from + (target - from) * ease(t);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frame);
    };
  }, [spec, reduced]);
}

// Arrows sit on the middle of the pictures, not of the whole slide with its
// caption. Layout offsets, so an entering slide's scale does not move them.
function useArrowLine(box: { current: HTMLElement | null }) {
  useEffect(() => {
    const holder = box.current;
    const root = holder?.querySelector<HTMLElement>(
      '[aria-roledescription="carousel"]',
    );
    if (!holder || !root || typeof ResizeObserver === "undefined") return;
    let frame: HTMLElement | null = null;
    const place = () => {
      frame = root.querySelector<HTMLElement>(FRAME);
      if (!frame) return holder.style.removeProperty("--arrow-y");
      let top = 0;
      let node: HTMLElement | null = frame;
      while (node && node !== root) {
        top += node.offsetTop;
        const parent = node.offsetParent as HTMLElement | null;
        if (!parent || !root.contains(parent)) {
          top -= root.offsetTop;
          break;
        }
        node = parent;
      }
      holder.style.setProperty(
        "--arrow-y",
        `${Math.round(top + frame.offsetHeight / 2)}px`,
      );
      observer.observe(frame);
    };
    const observer = new ResizeObserver(place);
    observer.observe(root);
    place();
    return () => observer.disconnect();
  }, [box]);
}

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
  const glide = usePan();
  const box = useRef<HTMLDivElement>(null);
  useArrowLine(box);
  return (
    <div className="contents" ref={box}>
      <UiCarousel
        {...props}
        className={className}
        classNames={{
          arrow: cn("choreo-arrow", arrowClassName),
          slide: cn(styles.slide, itemClassName),
        }}
        frameSelector={FRAME}
        glide={glide}
        ready
        trackProps={TRACK}
        renderSlide={({ children, className: slideClass, index }) => (
          <Part className={slideClass} index={index} name={part}>
            {children}
          </Part>
        )}
      />
    </div>
  );
}
