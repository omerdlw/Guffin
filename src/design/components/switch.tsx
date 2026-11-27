"use client";

import {
  type ButtonHTMLAttributes,
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  clamp,
  drive,
  DRAG_SLOP,
  feel,
  glassDepth,
  type Goal,
  spring,
  swellBox,
} from "@/design/glass/spring";
import { cn } from "@/design/ui";

interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "role" | "type"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const TRACK_W = 64;
const KNOB_W = 38;
const KNOB_H = 24;
const TRAVEL_PX = TRACK_W - 4 - KNOB_W;

const TRAVEL = feel(300, 0.82);
const FOLLOW = feel(900, 0.95);
const GLASS_ON = feel(700, 0.72);
const GLASS_OFF = feel(180, 0.85);
const JELLY = feel(220, 0.5);
const TINT = feel(420, 1);
const SWELL_X = 0.6;
const SWELL_Y = 0.68;

const REDUCED = "(prefers-reduced-motion: reduce)";

export function Switch({
  checked = false,
  className,
  disabled = false,
  onCheckedChange,
  ...props
}: SwitchProps) {
  const button = useRef<HTMLButtonElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const knob = useRef<HTMLSpanElement>(null);

  const latest = useRef({ checked, onCheckedChange });
  useLayoutEffect(() => {
    latest.current = { checked, onCheckedChange };
  });

  const engine = useRef<{
    down: (event: PointerEvent<HTMLButtonElement>) => void;
    move: (event: PointerEvent<HTMLButtonElement>) => void;
    up: (event: PointerEvent<HTMLButtonElement>, cancel: boolean) => void;
    wake: () => void;
  } | null>(null);

  useEffect(() => {
    const root = button.current;
    const paint = fill.current;
    const glass = knob.current;
    if (!root || !paint || !glass) return;
    const reduced = matchMedia(REDUCED);

    const x = spring(latest.current.checked ? TRAVEL_PX : 0);
    const amount = spring();
    const stretch = spring();
    const tint = spring(latest.current.checked ? 1 : 0);
    let on = latest.current.checked;
    let pressed = false;
    let dragging = false;
    let trip = false;
    let startX = 0;
    let grab = 0;
    let pointerX = 0;
    let pointer: number | null = null;

    const local = (clientX: number) =>
      clientX - root.getBoundingClientRect().left - 2;

    const goals = (): Goal[] => {
      const tx = dragging
        ? clamp(pointerX - grab, 0, TRAVEL_PX)
        : on
          ? TRAVEL_PX
          : 0;
      if (Math.abs(x.x - tx) < 1) trip = false;
      const lit = pressed || dragging || trip;
      return [
        [x, tx, dragging ? FOLLOW : TRAVEL],
        [amount, lit ? 1 : 0, lit ? GLASS_ON : GLASS_OFF],
        [stretch, clamp(Math.abs(x.v) / 1600, 0, 0.2), JELLY],
        [tint, x.x > TRAVEL_PX / 2 ? 1 : 0, TINT],
      ];
    };

    const draw = () => {
      const g = clamp(amount.x, 0, 1);
      const sx = 1 + SWELL_X * g + stretch.x;
      const sy = 1 + SWELL_Y * g - stretch.x * 0.5;
      swellBox(glass, x.x, KNOB_W, KNOB_H, sx, sy);
      glass.style.backgroundColor = `color-mix(in oklab, var(--knob) ${((1 - g) * 100).toFixed(1)}%, var(--liquid-tint))`;
      glass.style.setProperty("--liquid-drop", glassDepth(g));
      paint.style.opacity = clamp(tint.x, 0, 1).toFixed(3);
    };

    const motion = drive(goals, draw, () => reduced.matches);
    draw();

    engine.current = {
      down(event) {
        if (event.button !== 0 || pointer !== null) return;
        pointer = event.pointerId;
        const at = local(event.clientX);
        startX = at;
        pointerX = at;
        pressed = true;
        grab = at >= x.x && at <= x.x + KNOB_W ? at - x.x : KNOB_W / 2;
        root.setPointerCapture(event.pointerId);
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
        if (root.hasPointerCapture(event.pointerId)) {
          root.releasePointerCapture(event.pointerId);
        }
        const next = cancel
          ? on
          : dragging
            ? x.x + KNOB_W / 2 > (TRAVEL_PX + KNOB_W) / 2
            : !on;
        trip = dragging || next !== on;
        pressed = false;
        dragging = false;
        on = next;
        if (next !== latest.current.checked) {
          latest.current.onCheckedChange?.(next);
        }
        motion.wake();
      },
      wake() {
        if (latest.current.checked !== on) trip = true;
        on = latest.current.checked;
        motion.wake();
      },
    };

    return () => {
      motion.stop();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.wake();
  }, [checked]);

  return (
    <button
      {...props}
      aria-checked={checked}
      className={cn(
        "group relative inline-flex h-7 w-[64px] shrink-0 cursor-pointer touch-pan-y rounded-full select-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-cursor="point"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        if (event.detail === 0) onCheckedChange?.(!checked);
      }}
      onLostPointerCapture={(event) => engine.current?.up(event, false)}
      onPointerCancel={(event) => engine.current?.up(event, true)}
      onPointerDown={(event) => !disabled && engine.current?.down(event)}
      onPointerMove={(event) => engine.current?.move(event)}
      onPointerUp={(event) => engine.current?.up(event, false)}
      ref={button}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-fill-active ring-1 ring-edge ring-inset group-hover:ring-edge-hover"
      >
        <span
          className="absolute inset-0 rounded-full bg-primary"
          ref={fill}
          style={{ opacity: checked ? 1 : 0 }}
        />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "liquid liquid-clear pointer-events-none absolute top-0.5 left-0.5 h-6 w-[38px] rounded-full [--liquid-bend:0.18] [--liquid-drop:0_1px_3px_rgb(0_0_0/0.2)] [--liquid-tint:rgb(var(--ink-rgb)/0.04)]",
          checked ? "[--knob:var(--on-primary)]" : "[--knob:var(--ink-lead)]",
        )}
        ref={knob}
        style={{
          backgroundColor: "var(--knob)",
          transform: `translateX(${checked ? TRAVEL_PX : 0}px)`,
        }}
      />
    </button>
  );
}
