"use client";

import { type ReactNode, useRef } from "react";
import { motion, useReducedMotion } from "@/motion/lib";
import { POINTS } from "@/motion/constants";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { step, tween } from "@/motion/utils";
import { cn } from "../../foundations/cn";

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

/** The scene a dock surface plays in: its parts enter on the surface score. */
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
        <SurfaceAnchor />
        {children}
      </div>
    </SurfaceRoot>
  );
}

/**
 * Where the dock puts focus when a surface opens (`data-dock-autofocus`). The
 * dock would otherwise focus the first control, which pulls the caret into the
 * first input. This is out of the Tab order and draws no outline.
 */
export function SurfaceAnchor() {
  return (
    <span
      className="sr-only"
      data-dock-autofocus=""
      data-own-focus=""
      tabIndex={-1}
    />
  );
}

const UNFOLD = tween(step(-0.5), POINTS.fade);

/** Opens its content from zero height, then lets it overflow. */
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

/** One action mounted in a dock surface: it unfolds into place. */
export function DockAction({ children }: { children: ReactNode }) {
  return (
    <SurfaceStage>
      <Unfold>
        <SurfacePart name="item">{children}</SurfacePart>
      </Unfold>
    </SurfaceStage>
  );
}
