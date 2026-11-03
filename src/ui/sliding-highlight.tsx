"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "./cn";
import { SPRING } from "@/config/theme/motion";

export function SlidingHighlight({
  className = "-z-10 rounded-card bg-fill",
  layoutId,
}: {
  className?: string;
  layoutId: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      layoutId={layoutId}
      transition={{
        layout: reducedMotion ? { duration: 0 } : SPRING.follow,
      }}
    />
  );
}
