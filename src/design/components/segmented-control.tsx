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

interface SegmentedItem<K extends string> {
  count?: number;
  disabled?: boolean;
  icon?: string;
  key: K;
  label: ReactNode;
}

interface SegmentedControlProps<K extends string> {
  ariaLabel?: string;
  className?: string;
  items: readonly SegmentedItem<K>[];
  onChange: (key: K) => void;
  value: K;
  width?: "fit" | "fill";
}

interface Box {
  left: number;
  width: number;
}

const TRAVEL = feel(260, 0.82);
const FOLLOW = feel(900, 0.95);
const GLASS_ON = feel(520, 1);
const GLASS_OFF = feel(190, 0.9);
const JELLY = feel(200, 0.5);
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
    let thumbHeight = 0;
    const x = spring();
    const w = spring();
    const amount = spring();
    const stretch = spring();

    let target = latest.current.chosenIndex;
    let pressed = false;
    let dragging = false;
    let trip = false;
    let grab = 0;
    let startX = 0;
    let pointerX = 0;
    let tapped = -1;
    let shownLit: number | null = null;
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
      const sx = 1 + SWELL_X * g + stretch.x;
      const sy = 1 + SWELL_Y * g - stretch.x * 0.6;
      const width = `${w.x.toFixed(2)}px`;
      const transform = thumbTransform(x.x, sx, sy);
      chosenFill.style.visibility = "visible";
      chosenFill.style.width = width;
      chosenFill.style.transform = transform;
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
      onLostPointerCapture={(event) => engine.current?.up(event, false)}
      onPointerCancel={(event) => engine.current?.up(event, true)}
      onPointerDown={(event) => engine.current?.down(event)}
      onPointerMove={(event) => engine.current?.move(event)}
      onPointerUp={(event) => engine.current?.up(event, false)}
      ref={root}
      role="tablist"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-chosen shadow-(--liquid-well-shadow) ring-1 ring-chosen-edge ring-inset"
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
                ? "font-semibold text-ink"
                : "text-ink-body focus-visible:text-ink",
              active &&
                !ready &&
                "bg-chosen shadow-(--liquid-well-shadow) ring-1 ring-chosen-edge ring-inset",
            )}
            data-cursor="point"
            disabled={item.disabled}
            key={item.key}
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
            <span className="grid">
              <span
                aria-hidden="true"
                className="invisible col-start-1 row-start-1 font-semibold"
              >
                {item.label}
              </span>
              <span className="col-start-1 row-start-1">{item.label}</span>
            </span>
            {item.count !== undefined && item.count > 0 ? (
              <span
                className={cn(
                  "font-medium tabular-nums",
                  index === shown ? "text-ink-muted" : "text-ink-faint",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        className="liquid liquid-clear pointer-events-none absolute top-0.5 left-0 z-10 rounded-full [--liquid-tint:rgb(var(--ink-rgb)/0.03)]"
        ref={lens}
        style={{ opacity: 0, visibility: "hidden" }}
      />
    </div>
  );
}

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
