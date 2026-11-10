"use client";

import {
  type JSX,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  type AmbientPalette,
  paletteVarMap,
  useAmbientTheme,
} from "@omerdlw/base-framework/modules/ambient";
import { useArrival } from "@omerdlw/base-framework/modules/navigation";
import { passageOf } from "./passage";
import { useEngine } from "./react";

/**
 * What a route shows while it loads when it came from another page: nothing
 * of its own. The passage veil is already over the screen (or rises over it
 * now) and stays until this page's stage opens, so there is no skeleton to
 * flash and no hard cover to pop away. The departing page's palette keeps
 * the light the same across the cut.
 */
function Veiled({ palette }: { palette: AmbientPalette | null }) {
  const engine = useEngine();
  const colors = useMemo(
    () => (palette ? paletteVarMap(palette) : null),
    [palette],
  );
  useAmbientTheme(colors ? { colors } : null);
  useLayoutEffect(() => {
    void passageOf(engine).close({ keep: true, quick: true });
  }, [engine]);
  return <div aria-hidden="true" className="min-h-screen" />;
}

export function Handoff({ children }: { children: ReactNode }): JSX.Element {
  const arrival = useArrival();
  const passage = passageOf(useEngine());
  const covered = useSyncExternalStore(
    passage.phase.subscribe,
    () => passage.covering,
    () => false,
  );
  return arrival || covered ? (
    <Veiled palette={arrival?.payload.palette ?? null} />
  ) : (
    <>{children}</>
  );
}
