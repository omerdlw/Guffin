"use client";

import { DockSurfaceExtension } from "@omerdlw/base-framework/dock";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@/design/components/icon";
import {
  clamp,
  drive,
  DRAG_SLOP,
  feel,
  GLASS_CLASS,
  type Goal,
  spring,
} from "@/design/components/glass-thumb";
import { cn } from "@/design/ui";

export interface SegmentedItem<K extends string> {
  count?: number;
  disabled?: boolean;
  icon?: string;
  key: K;
  label: ReactNode;
}

export interface SegmentedControlProps<K extends string> {
  ariaLabel?: string;
  className?: string;
  items: readonly SegmentedItem<K>[];
  onChange: (key: K) => void;
  value: K;
}

interface Box {
  left: number;
  width: number;
}

/** The indicator travels with a little overshoot, and follows a drag tight. */
const TRAVEL = feel(260, 0.7);
const FOLLOW = feel(900, 0.95);
const GLASS_ON = feel(520, 1);
const GLASS_OFF = feel(190, 0.9);
/** Stretch along the travel: loose, so the glass wobbles as it lands. */
const JELLY = feel(200, 0.3);
/** At full glass the indicator swells past the track. */
const SWELL_X = 0.12;
const SWELL_Y = 0.3;

const REDUCED = "(prefers-reduced-motion: reduce)";

function nearest(boxes: readonly Box[], centre: number) {
  let best = 0;
  let distance = Infinity;
  boxes.forEach((box, index) => {
    const d = Math.abs(box.left + box.width / 2 - centre);
    if (d < distance) {
      distance = d;
      best = index;
    }
  });
  return best;
}

/**
 * Picks one of a few items. The chosen one sits on a solid indicator; press
 * it and it swells into clear glass you can drag across the others, and it
 * travels as glass whenever the choice changes, settling solid on arrival.
 */
export function SegmentedControl<K extends string>({
  ariaLabel,
  className,
  items,
  onChange,
  value,
}: SegmentedControlProps<K>) {
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLSpanElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const [lit, setLit] = useState<number | null>(null);

  const chosenIndex = Math.max(
    0,
    items.findIndex((item) => item.key === value),
  );

  // Latest props for the pointer handlers and the frame loop.
  const latest = useRef({ chosenIndex, items, onChange });
  useLayoutEffect(() => {
    latest.current = { chosenIndex, items, onChange };
  });

  const engine = useRef<{
    down: (event: PointerEvent<HTMLDivElement>) => void;
    move: (event: PointerEvent<HTMLDivElement>) => void;
    up: (event: PointerEvent<HTMLDivElement>, cancel: boolean) => void;
    wake: () => void;
  } | null>(null);

  useEffect(() => {
    const list = root.current;
    const solid = plate.current;
    const glass = lens.current;
    if (!list || !solid || !glass) return;
    const reduced = matchMedia(REDUCED);

    let boxes: Box[] = [];
    let base = 0;
    let measured = false;
    const x = spring();
    const w = spring();
    const amount = spring();
    const stretch = spring();

    let target = latest.current.chosenIndex;
    let pressed = false;
    let dragging = false;
    let grab = 0;
    let startX = 0;
    let pointerX = 0;
    let tapped = -1;
    let shownLit: number | null = null;

    const local = (clientX: number) =>
      clientX - list.getBoundingClientRect().left;

    const goals = (): Goal[] => {
      const chosen = boxes[target];
      if (!chosen) return [];
      let tx = chosen.left;
      let tw = chosen.width;
      if (dragging) {
        const first = boxes[0]!;
        const end = boxes[boxes.length - 1]!;
        tw = boxes[nearest(boxes, x.x + w.x / 2)]!.width;
        tx = clamp(pointerX - grab, first.left, end.left + end.width - tw);
      }
      const travelling = Math.abs(x.x - tx) > 1.5 || Math.abs(w.x - tw) > 1.5;
      const on = pressed || dragging || travelling;
      return [
        [x, tx, dragging ? FOLLOW : TRAVEL],
        [w, tw, dragging ? FOLLOW : TRAVEL],
        [amount, on ? 1 : 0, on ? GLASS_ON : GLASS_OFF],
        [stretch, clamp(Math.abs(x.v) / 2600, 0, 0.16), JELLY],
      ];
    };

    const draw = () => {
      const g = clamp(amount.x, 0, 1);
      solid.style.transform = `translateX(${x.x.toFixed(2)}px)`;
      solid.style.width = `${w.x.toFixed(2)}px`;
      solid.style.opacity = (1 - g).toFixed(3);
      const sx = (w.x / base) * (1 + SWELL_X * g + stretch.x);
      const sy = 1 + SWELL_Y * g - stretch.x * 0.6;
      glass.style.transform = `translateX(${(x.x + (w.x - base) / 2).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      glass.style.opacity = g.toFixed(3);
      glass.style.visibility = g < 0.01 ? "hidden" : "visible";
      const next = dragging ? nearest(boxes, x.x + w.x / 2) : null;
      if (next !== shownLit) {
        shownLit = next;
        setLit(next);
      }
    };

    const motion = drive(goals, draw, () => reduced.matches);

    const measure = () => {
      boxes = Array.from(
        list.querySelectorAll<HTMLElement>('[role="tab"]'),
        (tab) => ({ left: tab.offsetLeft, width: tab.offsetWidth }),
      );
      const chosen = boxes[target];
      if (!chosen) return;
      // The glass keeps one drawn size and is scaled to each segment, so
      // its refraction never has to be redrawn mid-flight.
      base = chosen.width;
      glass.style.width = `${base}px`;
      if (!dragging) {
        // Layout moved (a font loaded, the page resized): follow at once.
        x.x = chosen.left;
        w.x = chosen.width;
        x.v = w.v = 0;
      }
      if (!measured) {
        measured = true;
        setReady(true);
      }
      motion.wake();
    };

    const sizes = new ResizeObserver(measure);
    sizes.observe(list);
    for (const tab of list.children) sizes.observe(tab);
    measure();

    engine.current = {
      down(event) {
        if (event.button !== 0 || !boxes.length) return;
        const at = local(event.clientX);
        startX = at;
        pointerX = at;
        const tab = (event.target as Element).closest('[role="tab"]');
        tapped = tab
          ? Array.from(list.querySelectorAll('[role="tab"]')).indexOf(tab)
          : -1;
        pressed = at >= x.x && at <= x.x + w.x;
        grab = pressed ? at - x.x : w.x / 2;
        list.setPointerCapture(event.pointerId);
        motion.wake();
      },
      move(event) {
        if (!list.hasPointerCapture(event.pointerId)) return;
        pointerX = local(event.clientX);
        if (!dragging && Math.abs(pointerX - startX) > DRAG_SLOP) {
          dragging = true;
        }
        if (dragging) motion.wake();
      },
      up(event, cancel) {
        if (!list.hasPointerCapture(event.pointerId)) return;
        list.releasePointerCapture(event.pointerId);
        const { items: options, onChange: choose } = latest.current;
        const picked = cancel
          ? -1
          : dragging
            ? nearest(boxes, x.x + w.x / 2)
            : tapped;
        pressed = false;
        dragging = false;
        const item = options[picked];
        if (item && !item.disabled) {
          target = picked;
          choose(item.key);
        }
        motion.wake();
      },
      wake() {
        target = latest.current.chosenIndex;
        motion.wake();
      },
    };

    return () => {
      sizes.disconnect();
      motion.stop();
      engine.current = null;
    };
  }, [items.length]);

  useEffect(() => {
    engine.current?.wake();
  }, [chosenIndex]);

  const select = (index: number) => {
    const item = items[index];
    if (item && !item.disabled && item.key !== value) onChange(item.key);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    for (
      let index = chosenIndex + step;
      index >= 0 && index < items.length;
      index += step
    ) {
      if (items[index]!.disabled) continue;
      select(index);
      root.current
        ?.querySelectorAll<HTMLElement>('[role="tab"]')
        [index]?.focus();
      return;
    }
  };

  if (items.length === 0) return null;
  const shown = lit ?? chosenIndex;

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "choreo-segmented relative inline-flex h-control-sm w-fit max-w-full touch-pan-y items-stretch gap-0.5 rounded-full bg-fill p-0.5 ring-1 ring-edge ring-inset select-none",
        className,
      )}
      onKeyDown={onKeyDown}
      onLostPointerCapture={(event) => engine.current?.up(event, true)}
      onPointerCancel={(event) => engine.current?.up(event, true)}
      onPointerDown={(event) => engine.current?.down(event)}
      onPointerMove={(event) => engine.current?.move(event)}
      onPointerUp={(event) => engine.current?.up(event, false)}
      ref={root}
      role="tablist"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-chosen"
        data-pill=""
        ref={plate}
        style={{ opacity: 0 }}
      />
      {/* Under the labels: the glass bends the track, the words stay crisp. */}
      <span
        aria-hidden="true"
        className={cn(GLASS_CLASS, "top-0.5 bottom-0.5 left-0 rounded-full")}
        ref={lens}
        style={{ opacity: 0, visibility: "hidden" }}
      />
      {items.map((item, index) => {
        const active = index === chosenIndex;
        return (
          <button
            aria-selected={active}
            className={cn(
              "ui-fade relative inline-flex min-w-fit cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 type-meta font-medium whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-edge-focus focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50",
              index === shown
                ? "text-ink"
                : "text-ink-body hover:text-ink focus-visible:text-ink",
              active && !ready && "bg-chosen",
            )}
            // Only the cursor's dot here: the indicator is the glass.
            data-cursor="point"
            disabled={item.disabled}
            key={item.key}
            // Pointer presses resolve on release (tap or drag); this is the
            // keyboard's Enter and Space.
            onClick={(event) => {
              if (event.detail === 0) select(index);
            }}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {item.icon ? (
              <Icon
                className="center size-3 text-[length:12px]"
                icon={item.icon}
                size={12}
              />
            ) : null}
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 ? (
              <span className="-ml-0.5 tabular-nums">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SurfaceSegmentedControl<K extends string>({
  align = "center",
  id,
  ...props
}: SegmentedControlProps<K> & {
  align?: "center" | "left" | "right";
  id: string;
}) {
  return (
    <DockSurfaceExtension align={align} id={id}>
      <SegmentedControl {...props} />
    </DockSurfaceExtension>
  );
}
