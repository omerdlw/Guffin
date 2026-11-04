"use client";

import { type JSX, type ReactNode, useMemo } from "react";
import {
  type AmbientPalette,
  paletteVarMap,
  useAmbientTheme,
} from "@omerdlw/base-framework/modules/ambient";
import { useArrival } from "@omerdlw/base-framework/modules/navigation";

function Dark({ palette }: { palette: AmbientPalette | null }) {
  const colors = useMemo(
    () => (palette ? paletteVarMap(palette) : null),
    [palette],
  );
  useAmbientTheme(colors ? { colors } : null);
  return (
    <div aria-hidden="true" className="min-h-screen">
      <div className="fixed inset-0 z-20 bg-black" />
    </div>
  );
}

export function Handoff({ children }: { children: ReactNode }): JSX.Element {
  const arrival = useArrival();
  return arrival ? (
    <Dark palette={arrival.payload.palette ?? null} />
  ) : (
    <>{children}</>
  );
}
