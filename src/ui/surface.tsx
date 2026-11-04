"use client";

import { type ReactNode, useRef, type WheelEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { POINTS } from "@/motion/constants";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { step, tween } from "@/motion/utils";
import { cn } from "./cn";
import { SURFACE_PANEL, SURFACE_SCROLL } from "./tokens";

export function scrollWithin(event: WheelEvent<HTMLElement>) {
  const box = event.currentTarget;
  if (box.scrollHeight <= box.clientHeight) return;
  event.preventDefault();
  event.stopPropagation();
  const max = box.scrollHeight - box.clientHeight;
  box.scrollTop = Math.min(max, Math.max(0, box.scrollTop + event.deltaY));
}

export function SurfaceProse({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <div
      className={`${SURFACE_PANEL} ${SURFACE_SCROLL} max-h-[min(52dvh,24rem)] p-4`}
      data-scroll-native
      onWheel={scrollWithin}
    >
      <div className="flex flex-col gap-3 type-body leading-6 text-pretty [overflow-wrap:anywhere] text-ink-body select-text">
        {paragraphs.map((paragraph, index) => (
          <p className="whitespace-pre-line" key={index}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

const SURFACE = defineScore({
  tempo: -3,
  cast: {
    item: "paper",
    row: "paper",
    note: "glass",
  },
  opening: [{ rest: 0 }, ["item", "note"]],
  sections: {
    items: [["item", "note"]],
    rows: [["row", "note"]],
  },
});

const bound = bindScore(SURFACE);

const SurfaceRoot = bound.SurfaceRoot;
export const SurfacePart = bound.Part;
export const SurfaceSwap = bound.Swap;

export function SurfaceStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceRoot>
      <div className={cn("ui-scene w-full", className)} data-cinematic="">
        {children}
      </div>
    </SurfaceRoot>
  );
}

const UNFOLD = tween(step(-0.5), POINTS.fade);

export function Unfold({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      animate={{ height: "auto" }}
      initial={{ height: 0 }}
      onAnimationComplete={() => {
        if (box.current) box.current.style.overflow = "visible";
      }}
      ref={box}
      style={{ overflow: "clip" }}
      transition={reduced ? { duration: 0 } : UNFOLD}
    >
      {children}
    </motion.div>
  );
}
