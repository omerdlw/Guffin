"use client";

import {
  createContext,
  type ElementType,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clearMask, setMask } from "./dom";
import { type Exposure, useExposure } from "./expose";
import { within } from "./math";
import {
  OwnedScope,
  ScopeProvider,
  useAnyStage,
  useEngine,
  usePartOf,
  useScope,
} from "./react";
import { driverOf } from "./scroll";
import { childScope } from "./stage";
import { CURVE, elapsed } from "./time";

type WallPhase = "page" | "leaving" | "wall" | "closing" | "returning";

interface WallState {
  phase: WallPhase;
  open: (from?: HTMLElement | null) => void;
  close: () => void;
}

export interface WallStageProps {
  cue: string;
  wall: ReactNode;
  children: ReactNode;
}

export interface BloomProps {
  part: string;
  text: string;
  as?: ElementType;
  className?: string;
}

const WALL_RETURN_MARGIN = 24;

const WALL_SWEEP = [0, 0.62] as const;

const WALL_EDGE = 30;

const WALL_BAND = 46;

const WALL_ROOM = "0.6em";

const WALL_LIGHT = "rgb(255 253 247)";

const WALL_GLOW =
  "0 0 0.3em rgb(150 190 255 / 0.8), 0 0 0.9em rgb(110 160 255 / 0.5)";

const WallContext = createContext<WallState | null>(null);

export const useWall = () => useContext(WallContext);

const dialogOpen = () =>
  Boolean(document.querySelector("[role='dialog'], [aria-modal='true']"));

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
        from.getBoundingClientRect().top + window.scrollY - WALL_RETURN_MARGIN;
      driverOf(engine).to(top, { immediate: true });
      window.scrollTo({ top, behavior: "instant" });
    }
    void stage.restore().then(() => setPhase("page"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per phase; engine and stage are stable per mount
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

function bloom({ print, light }: Exposure, progress: number) {
  if (progress <= 0) {
    clearMask(print);
    print.style.opacity = "0";
    print.style.removeProperty("filter");
    light.style.opacity = "0";
    return;
  }
  if (progress >= 1) {
    clearMask(print);
    print.style.opacity = "1";
    print.style.removeProperty("filter");
    clearMask(light);
    light.style.opacity = "0";
    light.style.removeProperty("filter");
    return;
  }
  const time = elapsed(CURVE.silk, progress);
  const sweep = CURVE.glide(within(time, WALL_SWEEP));
  const edge = (100 + WALL_EDGE) * sweep;

  setMask(
    print,
    `linear-gradient(90deg, #000 ${edge - WALL_EDGE}%, transparent ${edge}%)`,
  );
  print.style.opacity = "1";
  print.style.filter = "none";

  setMask(
    light,
    `linear-gradient(90deg, transparent ${edge - WALL_BAND}%, #000 ${edge - WALL_EDGE * 0.4}%, transparent ${edge + 3}%)`,
  );
  light.style.opacity = (
    sweep <= 0 || sweep >= 1 ? 0 : Math.sin(Math.PI * sweep) ** 0.6
  ).toFixed(3);
  light.style.filter = "none";
}

export function Bloom({ part, text, as: Tag = "span", className }: BloomProps) {
  const stage = useAnyStage();
  const { get, print, light } = useExposure();

  const props = usePartOf(stage, part, {
    css: true,
    render: (_look, state) => {
      const exposure = get();
      if (!exposure) return;
      const progress = state.quiet ? (state.enter > 0 ? 1 : 0) : state.enter;
      bloom(exposure, progress);
    },
  });

  return (
    <Tag
      {...props}
      className={className}
      style={{ ...props.style, position: "relative" }}
    >
      <span
        data-print=""
        ref={print}
        style={{
          display: "block",
          margin: `-${WALL_ROOM}`,
          opacity: 0,
          padding: WALL_ROOM,
        }}
      >
        {text}
      </span>
      <span
        aria-hidden="true"
        ref={light}
        style={{
          position: "absolute",
          inset: `-${WALL_ROOM}`,
          display: "block",
          padding: WALL_ROOM,
          opacity: 0,
          pointerEvents: "none",
          userSelect: "none",
          color: WALL_LIGHT,
          textShadow: WALL_GLOW,
        }}
      >
        {text}
      </span>
    </Tag>
  );
}
