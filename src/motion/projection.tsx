"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  motion,
  motionValue,
  type MotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  BACKDROP_HERO,
  BACKDROP_HERO_MASK,
} from "@/design/components/backdrop";
import { cn } from "@/design/ui";
import type { Projector } from "./gl-projection";
import { useEngine } from "./react";
import { readable } from "./gl";

interface ProjectionProps {
  className?: string;
  cut?: number;
  defocusAt?: (scrollY: number) => number;
  halation?: number;
  mask?: CSSProperties;
  onReady?: () => void;
  position?: string;
  reel?: string | null;
  src: string;
}

const PROJECTION_KEYWORDS: Record<string, number> = {
  bottom: 1,
  center: 0.5,
  left: 0,
  right: 1,
  top: 0,
};

function parsePosition(position: string): [number, number] {
  const [x = "center", y = "center"] = position.trim().split(/\s+/);
  const read = (value: string) =>
    value.endsWith("%")
      ? Number.parseFloat(value) / 100
      : (PROJECTION_KEYWORDS[value] ?? 0.5);
  return [read(x), read(y)];
}

let projection: Promise<typeof import("./gl-projection")> | null = null;
const loadProjection = () =>
  (projection ??= import("./gl-projection").catch((error: unknown) => {
    projection = null;
    throw error;
  }));

export function useScrollY(): MotionValue<number> {
  const engine = useEngine();
  const [value] = useState(() => motionValue(engine.scroll.get()));
  useEffect(() => {
    value.set(engine.scroll.get());
    return engine.scroll.subscribe((y) => value.set(y));
  }, [engine, value]);
  return value;
}

export function Projection({
  className,
  cut = 1.1,
  defocusAt,
  halation = 0.55,
  mask = BACKDROP_HERO_MASK,
  onReady,
  position = "center 20%",
  reel = null,
  src,
}: ProjectionProps) {
  const reduced = Boolean(useReducedMotion());
  const scrollY = useScrollY();
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(defocusAt);
  const readyRef = useRef(onReady);
  const projector = useRef<Projector | null>(null);
  const [live, setLive] = useState(false);
  const [plain, setPlain] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const softened = useTransform(scrollY, (y) => {
    const amount = reduced ? 0 : (focusRef.current?.(y) ?? 0);
    return amount < 0.002
      ? "none"
      : `saturate(${(1 - amount * 0.35).toFixed(3)})`;
  });

  useEffect(() => {
    focusRef.current = defocusAt;
    readyRef.current = onReady;
  }, [defocusAt, onReady]);

  useEffect(() => {
    if (live) readyRef.current?.();
  }, [live]);

  useEffect(() => {
    if (plain || !image.current || !canvas.current) return;
    const [x, y] = parsePosition(position);
    const target = canvas.current;
    const source = image.current;
    let active = true;
    let running: Projector | null = null;
    void loadProjection()
      .then(({ project }) => {
        if (!active) return;
        running = project(target, source, {
          cut: reduced ? 0 : cut,
          defocusAt: focusRef,
          focus: [x, y],
          halation,
          onFail: () => setPlain(true),
          onLive: setLive,
          onRestore: () => setAttempt((count) => count + 1),
          reduced,
          scrollY,
          src,
        });
        projector.current = running;
      })
      .catch(() => {
        if (active) setPlain(true);
      });
    return () => {
      active = false;
      running?.stop();
      projector.current = null;
      setLive(false);
    };
  }, [attempt, cut, halation, plain, position, reduced, scrollY, src]);

  useEffect(() => {
    if (live) projector.current?.show(reel ?? src);
  }, [live, reel, src]);

  return (
    <div
      aria-hidden="true"
      className={cn(BACKDROP_HERO, className)}
      data-cursor-stage=""
    >
      <div className="absolute inset-0" style={mask}>
        <motion.img
          alt=""
          className="absolute inset-0 size-full object-cover"
          crossOrigin={plain ? undefined : "anonymous"}
          decoding="async"
          fetchPriority="high"
          key={plain ? "plain" : "read"}
          onError={() => {
            if (plain) onReady?.();
            else setPlain(true);
          }}
          onLoad={plain ? onReady : undefined}
          ref={image}
          src={plain ? (reel ?? src) : readable(src)}
          style={{
            filter: live ? undefined : softened,
            objectPosition: position,
            visibility: live ? "hidden" : undefined,
          }}
        />
        {plain ? null : (
          <canvas
            className="absolute inset-0 size-full"
            ref={canvas}
            style={{ opacity: live ? 1 : 0 }}
          />
        )}
      </div>
    </div>
  );
}
