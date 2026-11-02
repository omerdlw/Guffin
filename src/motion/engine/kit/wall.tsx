"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { driverOf } from "../scroll";
import {
  OwnedScope,
  ScopeProvider,
  useAnyStage,
  useEngine,
  useScope,
} from "../react";
import { childScope } from "../stage";

// A wall hung in front of the page (every picture of a film, say). The page
// steps back by each part's own way of leaving, the window returns to the
// top, and the wall plays its section from the dark. Closing takes the wall
// down the same way and brings the page forward to where the hand left it.

export type WallPhase = "page" | "leaving" | "wall" | "closing" | "returning";

export interface WallState {
  phase: WallPhase;
  open: (from?: HTMLElement | null) => void;
  close: () => void;
}

const WallContext = createContext<WallState | null>(null);

export const useWall = () => useContext(WallContext);

// Where the page comes back to: the element that opened the wall, this far
// below the top of the window.
const RETURN_MARGIN = 24;

const dialogOpen = () =>
  Boolean(document.querySelector("[role='dialog'], [aria-modal='true']"));

export interface WallStageProps {
  cue: string;
  wall: ReactNode;
  children: ReactNode;
}

export function WallStage({ cue, wall, children }: WallStageProps) {
  const stage = useAnyStage();
  const engine = useEngine();
  const scope = childScope(useScope(), useId());
  const [phase, setPhase] = useState<WallPhase>("page");
  const anchor = useRef<HTMLElement | null>(null);

  const open = useCallback(
    (from: HTMLElement | null = null) => {
      if (phase !== "page") return;
      anchor.current = from;
      setPhase("leaving");
      const driver = driverOf(engine);
      if (driver.active) driver.to(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
      void stage.recede(scope).then(() => setPhase("wall"));
    },
    [engine, phase, scope, stage],
  );

  const close = useCallback(() => {
    if (phase !== "wall") return;
    setPhase("closing");
    void stage.dismiss(scope).then(() => setPhase("returning"));
  }, [phase, scope, stage]);

  useLayoutEffect(() => {
    if (phase === "wall") {
      driverOf(engine).to(0, { immediate: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      stage.recue(cue, scope);
      return;
    }
    if (phase !== "returning") return;
    const from = anchor.current;
    if (from?.isConnected) {
      const top =
        from.getBoundingClientRect().top + window.scrollY - RETURN_MARGIN;
      driverOf(engine).to(top, { immediate: true });
      window.scrollTo({ top, behavior: "instant" });
    }
    void stage.restore().then(() => setPhase("page"));
  }, [phase]);

  useEffect(() => {
    if (phase !== "wall") return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialogOpen()) close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close, phase]);

  const value = useMemo(() => ({ phase, open, close }), [phase, open, close]);
  const hung = phase === "wall" || phase === "closing";

  return (
    <WallContext value={value}>
      <div hidden={hung}>{children}</div>
      {hung ? (
        <ScopeProvider value={scope}>
          <OwnedScope value>
            <div>{wall}</div>
          </OwnedScope>
        </ScopeProvider>
      ) : null}
    </WallContext>
  );
}
