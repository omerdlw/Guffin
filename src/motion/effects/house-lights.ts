"use client";

import { useEffect, useSyncExternalStore } from "react";
import { house, houseDown, show } from "@/motion/engine/kit/house";

// The engine's house lights, for pages that are still on the old stage: one
// count of what stands in front of the page, whichever system shows it.

export const houseIsDown = houseDown;

export function useHouseDown() {
  return useSyncExternalStore(house.subscribe, houseDown, () => false);
}

export function useShowing() {
  useEffect(() => show(), []);
}
