"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { Room, bindScore, defineScore } from "@/motion/engine";

// A salon: a scene in the dark, drawn by the page itself, with the page's own
// layer of names, dials and counts over it. Each draws its own arrival (the
// gold poured, the portrait printed, the wall lit); both leave with the page
// by the engine's laws.
const SALON = defineScore({
  cast: {
    scene: { matter: "plate", enter: "still", leave: "fade" },
    // Only its light is the engine's: a filter or transform here would hold
    // the fixed panels inside it.
    chrome: { matter: "glass", enter: "still", leave: "fade" },
  },
  opening: [["scene", "chrome"]],
});

// Named one by one: a client module's exports must be plain declarations for
// server components to reach them.
const bound = bindScore(SALON);

const SalonStageRoot = bound.StageRoot;
export const SalonPart = bound.Part;
export const useSalonPart = bound.usePart;

export function SalonStage({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const pathname = usePathname();

  return (
    <SalonStageRoot grade={null} memory={pathname}>
      <Room black />
      <MotionConfig reducedMotion="user">
        <main
          className={`${className} ui-scene overflow-x-clip`}
          data-cinematic=""
        >
          {children}
        </main>
      </MotionConfig>
    </SalonStageRoot>
  );
}
