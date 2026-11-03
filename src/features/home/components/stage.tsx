"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Room } from "@/motion/engine";
import { HomeStageRoot } from "../motion";

// The room reads its color from a small copy of the featured backdrop.
export const roomOf = (backdropPath: string | null) =>
  tmdbImageUrl("backdrop", backdropPath, "w300");

// The room is lit by the film being featured; the hero tells it which.
const LeadContext = createContext<(src: string | null) => void>(() => {});

export const useHomeLead = () => use(LeadContext);

export function HomeStage({
  backdrop,
  children,
}: {
  // The first feature's backdrop, so the room is lit from the first frame.
  backdrop: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [lead, setLead] = useState<string | null>(null);

  return (
    <HomeStageRoot grade={lead ?? roomOf(backdrop)} memory={pathname}>
      <Room />
      <LeadContext value={setLead}>{children}</LeadContext>
    </HomeStageRoot>
  );
}
