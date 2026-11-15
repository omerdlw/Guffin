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
} from "@/design/components/glass-thumb";
import { cn } from "@/design/ui";

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "role" | "type"
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** Track 60 × 28, knob 34 × 24 (a capsule, wider than tall), 2px inset. */
const TRACK_W = 60;
const KNOB_W = 34;
const KNOB_H = 24;
const TRAVEL_PX = TRACK_W - 4 - KNOB_W;

const TRAVEL = feel(300, 0.82);
const FOLLOW = feel(900, 0.95);
const GLASS_ON = feel(520, 1);
const GLASS_OFF = feel(180, 0.85);
const JELLY = feel(220, 0.5);
/** Half the width (px) of the fill's soft leading edge as it travels. */
const FILL_EDGE = 8;
/** At full glass the knob swells past the track. */
const SWELL_X = 0.32;
const SWELL_Y = 0.36;

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * A two-state toggle. One knob, made of the liquid material (liquid.css):
 * solid at rest; press it and it swells into clear liquid glass that bends
 * the track under it, which you can drag across; it crosses as glass and
 * settles solid.
 */
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
    let on = latest.current.checked;
    let pressed = false;
    let dragging = false;
    /** Crossing: glass until it first arrives, then solid for good. */
    let trip = false;
    let startX = 0;
    let grab = 0;
    let pointerX = 0;
    /**
     * The pointer being followed. Tracked here, not read back from
     * hasPointerCapture: once capture is lost (lostpointercapture, or a
     * browser that drops it before pointerup) that reads false, the release
     * was skipped and the knob stayed frozen as glass.
     */
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
      ];
    };

    const draw = () => {
      const g = clamp(amount.x, 0, 1);
      const sx = 1 + SWELL_X * g + stretch.x;
      const sy = 1 + SWELL_Y * g - stretch.x * 0.5;
      // Sized, not scaled, so the lens bends the track cleanly at its rim.
      swellBox(glass, x.x, KNOB_W, KNOB_H, sx, sy);
      // The solid knob gives way to clear glass: the track and its fill
      // show through it, bent at the rim.
      glass.style.backgroundColor = `color-mix(in oklab, var(--knob) ${((1 - g) * 100).toFixed(1)}%, var(--liquid-tint))`;
      glass.style.setProperty("--liquid-drop", glassDepth(g));
      // The fill runs from the left end to the knob's middle, out to the
      // right end once on: half and half under the glass in mid-crossing.
      const progress = clamp(x.x / TRAVEL_PX, 0, 1);
      const reach = 2 + x.x + KNOB_W / 2 + (KNOB_W / 2 + 2) * progress;
      // Its leading edge is soft while it travels: a hard edge under the
      // glass's rim bends into a saw.
      const soft = FILL_EDGE * (1 - progress);
      const mask =
        progress >= 1
          ? ""
          : `linear-gradient(90deg, #000 ${(reach - soft).toFixed(2)}px, transparent ${(reach + soft).toFixed(2)}px)`;
      paint.style.maskImage = mask;
      paint.style.webkitMaskImage = mask;
      paint.style.opacity = clamp(progress * 4, 0, 1).toFixed(3);
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
        "group relative inline-flex h-7 w-[60px] shrink-0 cursor-pointer touch-pan-y rounded-full select-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-cursor="point"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        // Pointer presses resolve on release (tap or drag); this is the
        // keyboard's Space and Enter.
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
      {/* The knob: the liquid material, solid at rest. */}
      <span
        aria-hidden="true"
        className={cn(
          "liquid liquid-clear pointer-events-none absolute top-0.5 left-0.5 h-6 w-[34px] rounded-full [--liquid-bend:0.2] [--liquid-drop:0_1px_3px_rgb(0_0_0/0.2)] [--liquid-tint:rgb(var(--ink-rgb)/0.04)]",
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
