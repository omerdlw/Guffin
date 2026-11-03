"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { cn } from "@/ui/cn";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { POINTS } from "../engine/curve";

const ON = { line: 0.3, run: 0.95 };
const OFF = { collapse: 0.18, point: 0.26, glow: 0.9 };
const LINE = 0.004;

const BEAM = "rgb(255 250 242)";

function afterglow(box: DOMRect) {
  const point = document.createElement("div");
  point.setAttribute("aria-hidden", "true");
  Object.assign(point.style, {
    background: BEAM,
    borderRadius: "9999px",
    height: "2px",
    left: `${box.left}px`,
    pointerEvents: "none",
    position: "fixed",
    top: `${box.top + box.height / 2 - 1}px`,
    width: `${box.width}px`,
    zIndex: String(Z_INDEX.MODAL + 1),
  });
  document.body.append(point);
  const animation = point.animate(
    [
      { offset: 0, opacity: 0, transform: "scaleX(1)" },
      { offset: 0.04, opacity: 1, transform: "scaleX(1)" },
      {
        easing: "cubic-bezier(0.06, 0.62, 0.2, 1)",
        offset: OFF.point / (OFF.point + OFF.glow),
        opacity: 1,
        transform: "scaleX(0.006)",
      },
      { opacity: 0, transform: "scaleX(0.004)" },
    ],
    {
      delay: OFF.collapse * 1000 * 0.8,
      duration: (OFF.point + OFF.glow) * 1000,
      easing: "cubic-bezier(0.5, 0, 0.9, 0.6)",
      fill: "both",
    },
  );
  const remove = () => point.remove();
  animation.onfinish = remove;
  animation.oncancel = remove;
}

export function Tube({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const present = useIsPresent();
  const set = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (present || reduced || !set.current) return;
    afterglow(set.current.getBoundingClientRect());
  }, [present, reduced]);

  const line = ON.line / ON.run;
  return (
    <motion.div
      animate={{
        scaleX: [0, 1, 1],
        scaleY: [LINE, LINE, 1],
        transition: {
          duration: ON.run,
          ease: [
            [0.3, 0.85, 0.3, 1],
            [0.33, 0.35, 0.15, 1],
          ],
          times: [0, line, 1],
        },
      }}
      className={cn("relative", className)}
      exit={{
        scaleY: LINE,
        transition: { duration: OFF.collapse, ease: [0.55, 0, 1, 0.45] },
      }}
      initial={reduced ? false : { scaleX: 0, scaleY: LINE }}
      ref={set}
    >
      {children}
      <motion.div
        animate={{
          opacity: [1, 1, 0],
          transition: {
            duration: ON.run,
            ease: POINTS.fade,
            times: [0, line * 1.2, 1],
          },
        }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        exit={{
          opacity: 1,
          transition: { duration: OFF.collapse * 0.7, ease: "easeIn" },
        }}
        initial={reduced ? false : { opacity: 1 }}
        style={{ background: BEAM }}
      />
    </motion.div>
  );
}
