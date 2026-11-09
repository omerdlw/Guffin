"use client";

import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Value } from "@/motion/engine";
import { StagePart, useEngine } from "@/motion/react";
import { CURVE } from "@/motion/time";
import { step } from "@/motion/utils";
import { cn } from "../../foundations/cn";
import { TONE } from "../../foundations/tones";
import { Button } from "../button";
import { Icon } from "../icon";
import styles from "./carousel.module.css";
import { glideTarget, rackClip, readScroll, type ScrollState } from "./track";
import { useDragScroll } from "./use-drag-scroll";
import { carouselArrowVariants } from "./variants";

const GLIDE_RUNG = 2;
const ARROW_RUNG = 1;

const ARROW_STYLE = {
  transitionDuration: `calc(${step(ARROW_RUNG)}s * var(--tempo, 1))`,
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

/**
 * A horizontal rack of cards. It scrolls by touch, wheel and mouse drag;
 * arrows glide a page at a time on the engine's dolly curve; the slides enter
 * as parts of the page's score (`part`); `onNearEnd` fires a page before the
 * end, to load more.
 */
export function Carousel({
  part,
  children,
  arrowClassName = TONE.arrows,
  className,
  itemClassName,
  label,
  onNearEnd,
}: CarouselProps) {
  const engine = useEngine();
  const track = useRef<HTMLDivElement>(null);
  const glide = useRef<Value | null>(null);
  const [scroll, setScroll] = useState<ScrollState>({
    left: false,
    right: false,
  });
  const [settled, setSettled] = useState(false);
  const settledRef = useRef(false);
  const nearEnd = useRef(onNearEnd);
  useDragScroll(track);

  useEffect(() => {
    nearEnd.current = onNearEnd;
  });

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    if (
      el.clientWidth > 0 &&
      el.scrollLeft + el.clientWidth * 2 >= el.scrollWidth
    )
      nearEnd.current?.();
    const next = readScroll(el);
    setScroll((previous) =>
      previous.left === next.left && previous.right === next.right
        ? previous
        : next,
    );
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const clip = () => {
      el.style.clipPath = rackClip(el) ?? "";
    };
    sync();
    clip();
    const observer = new ResizeObserver(() => {
      sync();
      clip();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, children]);

  const stopGlide = () => glide.current?.stop();

  const scrollBy = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const target = glideTarget(el, direction);
    if (engine.reduced.get()) {
      el.scrollLeft = target;
      return;
    }
    const value = (glide.current ??= new Value(engine.clock));
    value.stop();
    value.set(el.scrollLeft);
    const stop = value.subscribe((left) => {
      el.scrollLeft = left;
    });
    void value
      .to(target, { tween: step(GLIDE_RUNG), curve: CURVE.dolly })
      .then(stop);
  };

  const onSlide = (index: number) =>
    index === 0
      ? (_look: unknown, state: { enter: number }) => {
          if (settledRef.current || state.enter < 1) return;
          settledRef.current = true;
          setSettled(true);
        }
      : undefined;

  const left = settled && scroll.left;
  const right = settled && scroll.right;

  return (
    <div
      aria-label={label}
      aria-roledescription="carousel"
      className="relative w-full"
      role="group"
    >
      <div
        className={cn(
          "relative flex cursor-grab touch-pan-y gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain select-none data-[dragging=true]:cursor-grabbing",
          className,
        )}
        data-cursor="drag"
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={stopGlide}
        onScroll={sync}
        onTouchStart={stopGlide}
        onWheel={stopGlide}
        ref={track}
      >
        {Children.toArray(children).map((child, index) => (
          <StagePart
            className={cn(styles.slide, "shrink-0", itemClassName)}
            css
            index={index}
            key={(child as { key?: string }).key ?? index}
            name={part}
            render={onSlide(index)}
          >
            {child}
          </StagePart>
        ))}
      </div>

      <Button
        aria-hidden={!left}
        aria-label="Scroll left"
        className={cn(
          carouselArrowVariants({ side: "left", visible: left }),
          arrowClassName,
        )}
        onClick={() => scrollBy(-1)}
        style={ARROW_STYLE}
        tabIndex={left ? 0 : -1}
      >
        <Icon icon="solar:alt-arrow-left-bold" size={18} />
      </Button>
      <Button
        aria-hidden={!right}
        aria-label="Scroll right"
        className={cn(
          carouselArrowVariants({ side: "right", visible: right }),
          arrowClassName,
        )}
        onClick={() => scrollBy(1)}
        style={ARROW_STYLE}
        tabIndex={right ? 0 : -1}
      >
        <Icon icon="solar:alt-arrow-right-bold" size={18} />
      </Button>
    </div>
  );
}
