"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Room } from "@/motion/engine";
import { DetailStageRoot } from "../motion";

// The room is lit by the picture in front of it: a still the hand rests on,
// or else the page's own picture.
const LeadContext = createContext<(src: string | null) => void>(() => {});

export const useLead = () => use(LeadContext);

// Which set of pictures the gallery wall opens on.
interface WallSet {
  set: string | null;
  choose: (set: string) => void;
}

const WallSetContext = createContext<WallSet>({ set: null, choose: () => {} });

export const useWallSet = () => use(WallSetContext);

export function DetailStage({
  children,
  picture,
}: {
  children: ReactNode;
  picture: string | null;
}) {
  const pathname = usePathname();
  const [lead, setLead] = useState<string | null>(null);
  const [set, choose] = useState<string | null>(null);
  const wall = useMemo(() => ({ set, choose }), [set]);

  return (
    <DetailStageRoot grade={lead ?? picture} memory={pathname}>
      <Room />
      <LeadContext value={setLead}>
        <WallSetContext value={wall}>{children}</WallSetContext>
      </LeadContext>
    </DetailStageRoot>
  );
}
