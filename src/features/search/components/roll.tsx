"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { tween } from "@/config/theme/motion";
import { POINTS } from "@/motion/engine/curve";
import { step } from "@/motion/engine/ladder";

const ROLL = tween(step(-1), POINTS.glide);

// A figure that changes in place: the old one lifts away as the new one comes
// up under it, so a count never just swaps.
export function Roll({ value }: { value: number | string }) {
  const reduced = useReducedMotion();

  return (
    <span className="inline-flex">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          key={value}
          transition={ROLL}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
