"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useScrollDriver } from "@/motion/engine";

interface ReelState {
  project: (path: string | null) => void;
  reel: string | null;
}

const ReelContext = createContext<ReelState>({
  project: () => {},
  reel: null,
});

export const useReel = () => use(ReelContext);

export function ReelProvider({ children }: { children: ReactNode }) {
  const [reel, setReel] = useState<string | null>(null);
  const driver = useScrollDriver();

  const project = useCallback(
    (path: string | null) => {
      setReel(path);
      if (!path) return;
      if (driver.active) driver.to(0);
      else window.scrollTo({ behavior: "smooth", top: 0 });
    },
    [driver],
  );

  useEffect(() => {
    if (!reel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reel]);

  const value = useMemo(() => ({ project, reel }), [project, reel]);
  return <ReelContext value={value}>{children}</ReelContext>;
}
