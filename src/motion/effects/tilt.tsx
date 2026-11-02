"use client";

import type { PointerEvent, ReactNode } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/ui/cn";
import { POINTS } from "../engine/curve";
import { step } from "../engine/ladder";

// A print held in the hand: it leans toward the pointer and catches a glare
// where the pointer is. Only the hand moves it, so it composes with any
// entrance written on the element inside it. Children that catch the light
// themselves (a foil) take it as a function.

export interface TiltLight {
  glow: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

const SPRING = { damping: 17, mass: 1, stiffness: 52 };
const LEAN = 9;

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
  const rotateY = useTransform(sx, [-0.5, 0.5], [-LEAN, LEAN]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [LEAN, -LEAN]);
  const gx = useTransform(sx, [-0.5, 0.5], [0, 100]);
  const gy = useTransform(sy, [-0.5, 0.5], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(560px circle at ${gx}% ${gy}%, rgb(var(--white-rgb) / 0.18), transparent 55%)`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - box.left) / box.width - 0.5);
    y.set((event.clientY - box.top) / box.height - 0.5);
  };
  const onEnter = () =>
    animate(glow, 1, { duration: step(1), ease: [...POINTS.expo] });
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
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glare, opacity: glow }}
        />
      </motion.div>
    </div>
  );
}
