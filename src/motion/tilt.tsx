"use client";

import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from "react";
import {
  animate,
  motion,
  type MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/design/foundations/cn";
import { MATTER, POINTS, TILT_GLARE_RADIUS, TILT_LEAN } from "./constants";
import { response } from "./time";
import type { TiltLight } from "./types";
import { springForce, step } from "./utils";

const SPRING = springForce({
  ...response(MATTER.paper, -1),
  period: step(1),
});

export function Tilt({
  children,
  className,
  frameClassName,
}: {
  children: ReactNode | ((light: TiltLight) => ReactNode);
  className?: string;
  frameClassName?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glow = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-TILT_LEAN, TILT_LEAN]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [TILT_LEAN, -TILT_LEAN]);
  const gx = useTransform(sx, [-0.5, 0.5], [0, 100]);
  const gy = useTransform(sy, [-0.5, 0.5], [0, 100]);
  /*
   * The glare is one fixed radial gradient carried by a transform. Moving the
   * gradient's centre instead (a new background every frame) would repaint
   * the whole poster on every pointer move; a transform only recomposites.
   */
  const size = useRef({ height: 0, width: 0 });
  const glareX = useTransform(
    sx,
    (v) => (v + 0.5) * size.current.width - TILT_GLARE_RADIUS,
  );
  const glareY = useTransform(
    sy,
    (v) => (v + 0.5) * size.current.height - TILT_GLARE_RADIUS,
  );

  const measure = (element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    size.current = { height: box.height, width: box.width };
    return box;
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = measure(event.currentTarget);
    x.set((event.clientX - box.left) / box.width - 0.5);
    y.set((event.clientY - box.top) / box.height - 0.5);
  };
  const onEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    measure(event.currentTarget);
    animate(glow, 1, { duration: step(1), ease: [...POINTS.expo] });
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
    animate(glow, 0, { duration: step(2), ease: [...POINTS.expo] });
  };

  return (
    <div
      className={cn("[perspective:1400px]", className)}
      data-cursor="wrap"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
    >
      <motion.div
        className={cn("relative w-full rounded-sheet", frameClassName)}
        style={{ rotateX, rotateY }}
      >
        {typeof children === "function"
          ? children({ glow, x: gx, y: gy })
          : children}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          style={{ opacity: glow }}
        >
          <motion.div
            className="absolute top-0 left-0"
            style={{
              background:
                "radial-gradient(circle closest-side, rgb(var(--ink-rgb) / 0.18), transparent 55%)",
              height: TILT_GLARE_RADIUS * 2,
              width: TILT_GLARE_RADIUS * 2,
              x: glareX,
              y: glareY,
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Foil({
  glow,
  x,
  y,
}: {
  glow: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  // A 260% sheet slid by a transform: the same as moving a 260% background
  // from 0% to 100%, without repainting the foil on every pointer move.
  const slideX = useTransform(x, (v) => `${(-v * 1.6) / 2.6}%`);
  const slideY = useTransform(y, (v) => `${(-v * 1.6) / 2.6}%`);
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] mix-blend-color-dodge"
        style={{ opacity: glow }}
      >
        <motion.div
          className="absolute top-0 left-0 h-[260%] w-[260%]"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 28%, rgb(255 205 120 / 0.28) 42%, rgb(255 244 214 / 0.5) 50%, rgb(214 158 68 / 0.3) 58%, transparent 72%)",
            x: slideX,
            y: slideY,
          }}
        />
      </motion.div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-award/40 ring-inset"
      />
    </>
  );
}

const MAGNET_SPRING = springForce(response(MATTER.ink, 0));

export function Magnet({
  children,
  className,
  reach = 4,
}: {
  children: ReactNode;
  className?: string;
  reach?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const sx = useSpring(x, MAGNET_SPRING);
  const sy = useSpring(y, MAGNET_SPRING);

  useEffect(() => {
    const own = ref.current;
    const host =
      own?.parentElement?.closest<HTMLElement>("button, a") ??
      own?.parentElement;
    if (!host) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const box = host.getBoundingClientRect();
      const nx = ((event.clientX - box.left) / box.width - 0.5) * 2;
      const ny = ((event.clientY - box.top) / box.height - 0.5) * 2;
      x.set(nx * reach);
      y.set(ny * reach * 0.6);
    };
    const leave = () => {
      x.set(0);
      y.set(0);
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, [reach, x, y]);

  return (
    <motion.span
      className={cn("inline-flex items-center", className)}
      ref={ref}
      style={{ x: sx, y: sy }}
    >
      {children}
    </motion.span>
  );
}
