"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { preload } from "react-dom";
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

// Screen grain: one dot of noise per device pixel, tiled. The tile is a file
// of its own, preloaded with the document and laid in the layer from its first
// render, so the grain is there with the page's first paint and on every page
// after it, and never arrives after the page has. (Inside a cinematic scope
// the engine owns all motion, so a CSS fade would not run: it is not faded.)
const GRAIN_TILE = "/grain.png";

// The tile is drawn for two device pixels to the point.
const TILE = 512;

export function Grain({ className }: { className?: string }) {
  preload(GRAIN_TILE, { as: "image", fetchPriority: "high" });

  return (
    <div
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 z-0 size-full"}
      style={{
        backgroundImage: `url(${GRAIN_TILE})`,
        backgroundSize: `${TILE / 2}px`,
      }}
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
