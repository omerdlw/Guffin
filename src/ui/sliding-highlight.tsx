"use client";

import { motion, useReducedMotion } from "motion/react";
import { SPRING } from "@/motion/stage/tempo";

export function SlidingHighlight({
  className,
  layoutId,
}: {
  className: string;
  layoutId: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      layoutId={layoutId}
      transition={{
        layout: reducedMotion ? { duration: 0 } : SPRING.follow,
      }}
    />
  );
}
