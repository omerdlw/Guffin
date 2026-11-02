"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CURVE } from "../curve";
import { PHI, step } from "../ladder";
import { useEngine } from "../react";
import { Value } from "../value";
import { house, houseDown, show } from "./house";

// What a film room is lit by, behind and in front of the page: the wash of
// the room's tint, the grain of the screen, the glass edge of the lens, and
// the house lights going down while something stands in front of the page.
// All of it reads the engine's --tint and --tint-presence, so it follows the
// grade without any motion of its own.

const WASH = [
  "radial-gradient(70% 55% at 22% 38%, color-mix(in oklch, var(--tint, transparent) 10%, transparent), transparent 70%)",
  "radial-gradient(60% 50% at 88% 92%, color-mix(in oklch, var(--tint, transparent) 5%, transparent), transparent 70%)",
].join(", ");

const SHEEN =
  "radial-gradient(60% 45% at 16% 0%, rgb(255 255 255 / 0.018), transparent 70%)";

const GLASS = [
  "radial-gradient(ellipse 125% 105% at 50% 45%, transparent 58%, rgb(0 0 0 / 0.4))",
  "linear-gradient(to right, rgb(0 0 0 / 0.1), transparent 6%, transparent 94%, rgb(0 0 0 / 0.1))",
  "linear-gradient(to bottom, rgb(0 0 0 / 0.1), transparent 8%, transparent 92%, rgb(0 0 0 / 0.1))",
].join(", ");

// The house goes down to φ⁻¹ dark, on the rung a panel arrives on.
export const HOUSE_LEVEL = 1 / PHI;
export const HOUSE_RUNG = 1;

const GRAIN = 0.06;

export function useHouseDown() {
  return useSyncExternalStore(house.subscribe, houseDown, () => false);
}

// Something standing in front of the page while it is mounted.
export function useShowing(on = true) {
  useEffect(() => (on ? show() : undefined), [on]);
}

function HouseLights() {
  const engine = useEngine();
  const veil = useRef<HTMLDivElement>(null);
  const down = useHouseDown();
  const level = useRef<Value | null>(null);

  useEffect(() => {
    const el = veil.current;
    if (!el) return;
    const value = (level.current ??= new Value(engine.clock));
    const stop = value.subscribe((v) => {
      el.style.opacity = v.toFixed(3);
    });
    void value.to(down ? HOUSE_LEVEL : 0, {
      tween: engine.reduced.get() ? 0 : step(HOUSE_RUNG),
      curve: CURVE.silk,
    });
    return stop;
  }, [down, engine]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 bg-black"
      ref={veil}
      style={{ opacity: 0 }}
    />
  );
}

// Screen grain: one dot of noise per device pixel, drawn once per size.
export function Grain({ className }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const context = el?.getContext("2d");
    if (!el || !context) return;
    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(el.clientWidth * ratio));
      const height = Math.max(1, Math.round(el.clientHeight * ratio));
      el.width = width;
      el.height = height;
      const image = context.createImageData(width, height);
      const pixels = image.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const n = Math.random() - 0.5;
        const a = Math.abs(n) * 2 * GRAIN * 255;
        const v = n > 0 ? 255 : 0;
        pixels[i] = v;
        pixels[i + 1] = v;
        pixels[i + 2] = v;
        pixels[i + 3] = a;
      }
      context.putImageData(image, 0, 0);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 z-0 size-full"}
      ref={canvas}
    />
  );
}

export interface RoomProps {
  // A black room: no wash, no grain, only the glass.
  black?: boolean;
  grain?: boolean;
  grainClassName?: string;
}

export function Room({
  black = false,
  grain = true,
  grainClassName,
}: RoomProps) {
  return (
    <>
      {black ? null : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: WASH, opacity: "var(--tint-presence, 0)" }}
        />
      )}
      {black || !grain ? null : <Grain className={grainClassName} />}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ background: black ? GLASS : `${SHEEN}, ${GLASS}` }}
      />
      <HouseLights />
    </>
  );
}
