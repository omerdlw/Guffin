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
  GLASS_CLASS,
  type Goal,
  spring,
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
const TRAVEL_PX = 60 - 4 - 34;

const TRAVEL = feel(300, 0.62);
const FOLLOW = feel(900, 0.95);
const GLASS_ON = feel(520, 1);
const GLASS_OFF = feel(180, 0.85);
const JELLY = feel(220, 0.28);
/** At full glass the knob swells past the track. */
const SWELL_X = 0.28;
const SWELL_Y = 0.42;

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * A two-state toggle. Its knob is solid at rest; press it and it swells into
 * clear glass over the track, which you can drag across; it crosses as
 * glass and settles solid.
 */
export function Switch({
  checked = false,
  className,
  disabled = false,
  onCheckedChange,
  ...props
}: SwitchProps) {
  const track = useRef<HTMLButtonElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const lens = useRef<HTMLSpanElement>(null);

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
    const button = track.current;
    const solid = knob.current;
    const glass = lens.current;
    const paint = fill.current;
    if (!button || !solid || !glass || !paint) return;
    const reduced = matchMedia(REDUCED);

    const x = spring(latest.current.checked ? TRAVEL_PX : 0);
    const amount = spring();
    const stretch = spring();
    let on = latest.current.checked;
    let pressed = false;
    let dragging = false;
    let startX = 0;
    let grab = 0;
    let pointerX = 0;

    const local = (clientX: number) =>
      clientX - button.getBoundingClientRect().left - 2;

    const goals = (): Goal[] => {
      const tx = dragging
        ? clamp(pointerX - grab, 0, TRAVEL_PX)
        : on
          ? TRAVEL_PX
          : 0;
      const lit = pressed || dragging || Math.abs(x.x - tx) > 1;
      return [
        [x, tx, dragging ? FOLLOW : TRAVEL],
        [amount, lit ? 1 : 0, lit ? GLASS_ON : GLASS_OFF],
        [stretch, clamp(Math.abs(x.v) / 1600, 0, 0.2), JELLY],
      ];
    };

    const draw = () => {
      const g = clamp(amount.x, 0, 1);
      const at = `translateX(${x.x.toFixed(2)}px)`;
      solid.style.transform = at;
      solid.style.opacity = (1 - g).toFixed(3);
      // The track fills as the knob crosses it.
      paint.style.opacity = clamp(x.x / TRAVEL_PX, 0, 1).toFixed(3);
      const sx = 1 + SWELL_X * g + stretch.x;
      const sy = 1 + SWELL_Y * g - stretch.x * 0.5;
      glass.style.transform = `${at} scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      glass.style.opacity = g.toFixed(3);
      glass.style.visibility = g < 0.01 ? "hidden" : "visible";
    };

    const motion = drive(goals, draw, () => reduced.matches);
    draw();

    engine.current = {
      down(event) {
        if (event.button !== 0) return;
        const at = local(event.clientX);
        startX = at;
        pointerX = at;
        pressed = true;
        grab = at >= x.x && at <= x.x + 34 ? at - x.x : 17;
        button.setPointerCapture(event.pointerId);
        motion.wake();
      },
      move(event) {
        if (!button.hasPointerCapture(event.pointerId)) return;
        pointerX = local(event.clientX);
        if (!dragging && Math.abs(pointerX - startX) > DRAG_SLOP) {
          dragging = true;
        }
        if (dragging) motion.wake();
      },
      up(event, cancel) {
        if (!button.hasPointerCapture(event.pointerId)) return;
        button.releasePointerCapture(event.pointerId);
        const next = cancel
          ? on
          : dragging
            ? x.x + 17 > (TRAVEL_PX + 34) / 2
            : !on;
        pressed = false;
        dragging = false;
        on = next;
        if (next !== latest.current.checked) {
          latest.current.onCheckedChange?.(next);
        }
        motion.wake();
      },
      wake() {
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
        "relative inline-flex h-7 w-[60px] shrink-0 cursor-pointer touch-pan-y rounded-full ring-1 ring-inset select-none disabled:cursor-not-allowed disabled:opacity-50",
        "bg-fill-active ring-edge hover:ring-edge-hover",
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
      onLostPointerCapture={(event) => engine.current?.up(event, true)}
      onPointerCancel={(event) => engine.current?.up(event, true)}
      onPointerDown={(event) => !disabled && engine.current?.down(event)}
      onPointerMove={(event) => engine.current?.move(event)}
      onPointerUp={(event) => engine.current?.up(event, false)}
      ref={track}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-primary"
        ref={fill}
        style={{ opacity: checked ? 1 : 0 }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 h-6 w-[34px] rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.2)] transition-colors duration-fast",
          checked ? "bg-on-primary" : "bg-ink-lead",
        )}
        ref={knob}
        style={{
          transform: `translateX(${checked ? TRAVEL_PX : 0}px)`,
        }}
      />
      <span
        aria-hidden="true"
        className={cn(
          GLASS_CLASS,
          "top-0.5 left-0.5 h-6 w-[34px] rounded-full",
        )}
        ref={lens}
        style={{ opacity: 0, visibility: "hidden" }}
      />
    </button>
  );
}
