"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { CURVE } from "@/motion/engine/curve";
import { step } from "@/motion/engine/ladder";
import { StagePart, useEngine } from "@/motion/engine/react";
import { Value } from "@/motion/engine/value";
import { cn } from "@/ui/cn";
import { Button } from "./button";
import { Icon } from "./icon";
import { TONE } from "./page";

// A row of slides, each one a part of the page's score: they come in by the
// part's own verb as the row is reached, and the arrows appear once the
// first slide has settled. A press on an arrow glides the row by most of its
// width onto a slide's edge, on the rung a hand gesture takes.

const EDGE_TOLERANCE = 4;
const DRAG_THRESHOLD = 5;
const SCROLL_STEP = 0.8;
export const GLIDE_RUNG = 2;
const ARROW_RUNG = 1;

interface ScrollState {
  left: boolean;
  right: boolean;
}

function readScroll(track: HTMLElement): ScrollState {
  return {
    left: track.scrollLeft > EDGE_TOLERANCE,
    right:
      track.scrollLeft + track.clientWidth < track.scrollWidth - EDGE_TOLERANCE,
  };
}

function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const track = ref.current;
    if (!track) return;
    let startX = 0;
    let startLeft = 0;
    let pressed = false;
    let dragged = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pressed = true;
      dragged = false;
      startX = event.clientX;
      startLeft = track.scrollLeft;
    };
    const onMove = (event: PointerEvent) => {
      if (!pressed) return;
      const delta = event.clientX - startX;
      if (!dragged && Math.abs(delta) > DRAG_THRESHOLD) {
        dragged = true;
        track.dataset.dragging = "true";
      }
      if (dragged) track.scrollLeft = startLeft - delta;
    };
    const onUp = () => {
      pressed = false;
      delete track.dataset.dragging;
    };
    const onClickCapture = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("click", onClickCapture, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [ref]);
}

// Where a glide lands: the slide edge nearest most of a width away, or the
// end of the row when only a sliver would be left.
function glideTarget(track: HTMLElement, direction: -1 | 1): number {
  const max = track.scrollWidth - track.clientWidth;
  const wanted = track.scrollLeft + track.clientWidth * SCROLL_STEP * direction;
  const edges = Array.from(
    track.children,
    (child) => (child as HTMLElement).offsetLeft - track.offsetLeft,
  ).filter((edge) => edge <= max);
  if (edges.length === 0) return Math.min(max, Math.max(0, wanted));

  let target = edges.reduce((best, edge) =>
    Math.abs(edge - wanted) < Math.abs(best - wanted) ? edge : best,
  );
  if (direction === 1 && target <= track.scrollLeft + EDGE_TOLERANCE)
    target =
      edges.find((edge) => edge > track.scrollLeft + EDGE_TOLERANCE) ?? max;
  if (direction === -1 && target >= track.scrollLeft - EDGE_TOLERANCE)
    target =
      [...edges]
        .reverse()
        .find((edge) => edge < track.scrollLeft - EDGE_TOLERANCE) ?? 0;
  if (direction === 1 && max - target < track.clientWidth * 0.25) target = max;
  if (direction === -1 && target < track.clientWidth * 0.25) target = 0;
  return target;
}

const ARROW_CLASS =
  "center absolute top-1/2 z-10 size-9 -translate-y-1/2 transition-[opacity,scale,background-color] ease-out-expo cursor-pointer sm:size-10";

const ARROW_STYLE = {
  transitionDuration: `calc(${step(ARROW_RUNG)}s * var(--tempo, 1))`,
};

const arrowState = (visible: boolean) =>
  visible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-75";

export interface CarouselProps {
  // The part each slide plays; cast it with `enter: "door"` for pictures.
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
    sync();
    const observer = new ResizeObserver(sync);
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

  // The arrows wait for the row: they appear once its first slide is in.
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
          "flex cursor-grab touch-pan-y gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain select-none data-[dragging=true]:cursor-grabbing",
          className,
        )}
        data-cursor="drag"
        data-rack=""
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={stopGlide}
        onScroll={sync}
        onTouchStart={stopGlide}
        onWheel={stopGlide}
        ref={track}
      >
        {Children.toArray(children).map((child, index) => (
          <StagePart
            className={cn("cine-slide shrink-0", itemClassName)}
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
          ARROW_CLASS,
          arrowClassName,
          "left-2 sm:left-3",
          arrowState(left),
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
          ARROW_CLASS,
          arrowClassName,
          "right-2 sm:right-3",
          arrowState(right),
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
