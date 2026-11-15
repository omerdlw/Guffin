"use client";

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
import { SurfaceExtension } from "@/design/components/surface";
import {
  clamp,
  drive,
  DRAG_SLOP,
  feel,
  glassDepth,
  type Goal,
  spring,
  swellBox,
  thumbTransform,
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
  /** `fill`: as wide as its row, the items sharing it equally. */
  width?: "fit" | "fill";
}

interface Box {
  left: number;
  width: number;
}

/**
 * The indicator travels with the faintest overshoot (well under a pixel: it
 * lands centred on its item), and follows a drag tight.
 */
const TRAVEL = feel(260, 0.82);
const FOLLOW = feel(900, 0.95);
const GLASS_ON = feel(520, 1);
const GLASS_OFF = feel(190, 0.9);
/** Stretch along the travel: a single soft wobble as the glass lands. */
const JELLY = feel(200, 0.5);
/** At full glass the indicator swells past the track. */
const SWELL_X = 0.12;
const SWELL_Y = 0.36;

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
 * Picks one of a few items. One indicator in two layers that move as one: the
 * chosen fill, under the labels, and a clear liquid lens over them. At rest
 * only the fill shows and the labels read crisp on it; press it and the lens
 * swells in, so you drag a drop of glass across the labels and they bend at
 * its rim; it travels as glass whenever the choice changes and settles back
 * into the fill on arrival.
 */
export function SegmentedControl<K extends string>({
  ariaLabel,
  className,
  items,
  onChange,
  value,
  width = "fit",
}: SegmentedControlProps<K>) {
  const root = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
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
    const chosenFill = pill.current;
    const glass = lens.current;
    if (!list || !chosenFill || !glass) return;
    const reduced = matchMedia(REDUCED);

    let boxes: Box[] = [];
    let measured = false;
    /** The thumb's height at rest (the track's, inset). */
    let thumbHeight = 0;
    const x = spring();
    const w = spring();
    const amount = spring();
    const stretch = spring();

    let target = latest.current.chosenIndex;
    let pressed = false;
    let dragging = false;
    /**
     * On its way to a new item: glass from the moment the choice changes
     * until it first arrives, then solid for good, so the spring settling
     * round its mark never turns it back to glass.
     */
    let trip = false;
    let grab = 0;
    let startX = 0;
    let pointerX = 0;
    let tapped = -1;
    let shownLit: number | null = null;
    /**
     * The pointer being followed. Tracked here, not read back from
     * hasPointerCapture: once capture is lost (lostpointercapture, or a
     * browser that drops it before pointerup) that reads false, and the
     * release would be skipped, leaving the glass frozen mid-drag.
     */
    let pointer: number | null = null;

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
      if (Math.abs(x.x - tx) < 1.5 && Math.abs(w.x - tw) < 1.5) trip = false;
      const on = pressed || dragging || trip;
      return [
        [x, tx, dragging ? FOLLOW : TRAVEL],
        [w, tw, dragging ? FOLLOW : TRAVEL],
        [amount, on ? 1 : 0, on ? GLASS_ON : GLASS_OFF],
        [stretch, clamp(Math.abs(x.v) / 2600, 0, 0.16), JELLY],
      ];
    };

    const draw = () => {
      const g = clamp(amount.x, 0, 1);
      // The fill swells by a scale (it bends nothing); the glass is sized
      // for real, so its lens bends the labels cleanly at the rim.
      const sx = 1 + SWELL_X * g + stretch.x;
      const sy = 1 + SWELL_Y * g - stretch.x * 0.6;
      const width = `${w.x.toFixed(2)}px`;
      const transform = thumbTransform(x.x, sx, sy);
      chosenFill.style.visibility = "visible";
      chosenFill.style.width = width;
      chosenFill.style.transform = transform;
      // The fill gives way to the glass laid over the labels.
      chosenFill.style.opacity = (1 - g).toFixed(3);
      glass.style.visibility = g > 0.004 ? "visible" : "hidden";
      swellBox(glass, x.x, w.x, thumbHeight, sx, sy);
      glass.style.opacity = clamp(g * 1.6, 0, 1).toFixed(3);
      glass.style.setProperty("--liquid-drop", glassDepth(g));
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
      thumbHeight = chosenFill.offsetHeight;
      const chosen = boxes[target];
      if (!chosen) return;
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
      draw();
      motion.wake();
    };

    const sizes = new ResizeObserver(measure);
    sizes.observe(list);
    for (const tab of list.querySelectorAll('[role="tab"]')) {
      sizes.observe(tab);
    }
    measure();

    engine.current = {
      down(event) {
        if (event.button !== 0 || !boxes.length || pointer !== null) return;
        pointer = event.pointerId;
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
        if (event.pointerId !== pointer) return;
        pointerX = local(event.clientX);
        if (!dragging && Math.abs(pointerX - startX) > DRAG_SLOP) {
          dragging = true;
        }
        if (dragging) motion.wake();
      },
      up(event, cancel) {
        if (event.pointerId !== pointer) return;
        pointer = null;
        if (list.hasPointerCapture(event.pointerId)) {
          list.releasePointerCapture(event.pointerId);
        }
        const { items: options, onChange: choose } = latest.current;
        const picked = cancel
          ? -1
          : dragging
            ? nearest(boxes, x.x + w.x / 2)
            : tapped;
        // A drag released goes on as glass to the item it lands on.
        trip = dragging;
        pressed = false;
        dragging = false;
        const item = options[picked];
        if (item && !item.disabled) {
          if (picked !== target) trip = true;
          target = picked;
          choose(item.key);
        }
        motion.wake();
      },
      wake() {
        if (latest.current.chosenIndex !== target) trip = true;
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
        "choreo-segmented liquid-control relative h-control-sm max-w-full touch-pan-y items-stretch gap-0.5 rounded-full bg-fill p-0.5 ring-1 ring-edge ring-inset select-none",
        width === "fill" ? "flex w-full" : "inline-flex w-fit",
        className,
      )}
      onKeyDown={onKeyDown}
      // Capture lost before the release (it is ours to release otherwise):
      // settle as a release, on the item the glass is over.
      onLostPointerCapture={(event) => engine.current?.up(event, false)}
      onPointerCancel={(event) => engine.current?.up(event, true)}
      onPointerDown={(event) => engine.current?.down(event)}
      onPointerMove={(event) => engine.current?.move(event)}
      onPointerUp={(event) => engine.current?.up(event, false)}
      ref={root}
      role="tablist"
    >
      {/* The indicator's fill, under the labels. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-chosen"
        ref={pill}
        style={{ visibility: "hidden" }}
      />
      {items.map((item, index) => {
        const active = index === chosenIndex;
        return (
          <button
            aria-selected={active}
            className={cn(
              width === "fill" && "flex-1",
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
      {/* …and its glass, over them: clear, so the labels bend at its rim. */}
      <span
        aria-hidden="true"
        className="liquid liquid-clear pointer-events-none absolute top-0.5 left-0 z-10 rounded-full [--liquid-bend:0.15] [--liquid-tint:rgb(var(--ink-rgb)/0.03)]"
        ref={lens}
        style={{ opacity: 0, visibility: "hidden" }}
      />
    </div>
  );
}

/**
 * A surface's tabs, on the dock's shelf. It spans the shelf, 6.5px in on
 * every side, its pill concentric with the shelf's 22.5px corner.
 */
export function SurfaceSegmentedControl<K extends string>({
  align = "center",
  id,
  width = "fill",
  ...props
}: SegmentedControlProps<K> & {
  align?: "center" | "left" | "right";
  id: string;
}) {
  return (
    <SurfaceExtension align={align} id={id}>
      <SegmentedControl width={width} {...props} />
    </SurfaceExtension>
  );
}
