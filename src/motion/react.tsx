"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { type Engine, sharedEngine } from "./engine";
import { driverOf } from "./scroll";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const EngineContext = createContext<Engine | null>(null);

export function EngineProvider({
  engine,
  drive = false,
  children,
}: {
  engine?: Engine;
  drive?: boolean;
  children: ReactNode;
}) {
  const [value] = useState(() => engine ?? sharedEngine());

  useEffect(() => {
    if (!drive) return;
    const driver = driverOf(value);
    driver.start();
    return () => driver.stop();
  }, [drive, value]);

  return <EngineContext value={value}>{children}</EngineContext>;
}

export const useEngine = () => useContext(EngineContext) ?? sharedEngine();

export function useScrollDriver() {
  return driverOf(useEngine());
}

function subscribeReducedMotion(change: () => void) {
  const media = matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

export function useHydratedReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}
