"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { tween } from "@/config/theme/motion";
import { POINTS } from "@/motion/engine/curve";
import { step } from "@/motion/engine/ladder";

// The dock sizes its card to the content it holds, so an action that arrives
// at full height makes the card jump to it in one frame and drags the header
// up with it. It unfolds from nothing instead, and the card grows along with
// it.
const UNFOLD = tween(step(-0.5), POINTS.fade);

export function Unfold({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      animate={{ height: "auto" }}
      initial={{ height: 0 }}
      onAnimationComplete={() => {
        // Clipped only while it unfolds: a focus ring or a part's own lift
        // would be cut by the box afterwards.
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
