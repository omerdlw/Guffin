"use client";

import { useEffect, useSyncExternalStore } from "react";
import { preload } from "react-dom";
import { Signal } from "@/motion/engine";

interface RoomProps {
  black?: boolean;
  grain?: boolean;
  grainClassName?: string;
}

const WASH = [
  "radial-gradient(70% 55% at 22% 38%, color-mix(in oklch, var(--tint, transparent) var(--wash-tint-a), transparent), transparent 70%)",
  "radial-gradient(60% 50% at 88% 92%, color-mix(in oklch, var(--tint, transparent) var(--wash-tint-b), transparent), transparent 70%)",
  "radial-gradient(65% 50% at 15% 0%, color-mix(in oklab, var(--ambient-top, transparent) var(--wash-top), transparent), transparent 72%)",
  "radial-gradient(60% 55% at 100% 20%, color-mix(in oklab, var(--ambient-right, transparent) var(--wash-right), transparent), transparent 72%)",
  "radial-gradient(70% 50% at 0% 100%, color-mix(in oklab, var(--ambient-left, transparent) var(--wash-left), transparent), transparent 72%)",
  "radial-gradient(60% 45% at 85% 100%, color-mix(in oklab, var(--ambient-bottom, transparent) var(--wash-bottom), transparent), transparent 72%)",
].join(", ");

const SHEEN =
  "radial-gradient(60% 45% at 16% 0%, rgb(255 255 255 / var(--sheen-a)), transparent 70%)";

const GLASS = [
  "radial-gradient(ellipse 125% 105% at 50% 45%, transparent 60%, rgb(var(--vignette-rgb) / var(--vignette-a)))",
  "linear-gradient(to right, rgb(var(--vignette-rgb) / var(--vignette-edge)), transparent 6%, transparent 94%, rgb(var(--vignette-rgb) / var(--vignette-edge)))",
  "linear-gradient(to bottom, rgb(var(--vignette-rgb) / var(--vignette-edge)), transparent 8%, transparent 92%, rgb(var(--vignette-rgb) / var(--vignette-edge)))",
].join(", ");

const HOUSE_LEVEL = 0.618;

const GRAIN_TILE = "/grain.png";

const GRAIN_SIZE = 256;

const house = new Signal(0);

export const houseDown = () => house.get() > 0;

function show(): () => void {
  house.set(house.get() + 1);
  let shown = true;
  return () => {
    if (!shown) return;
    shown = false;
    house.set(house.get() - 1);
  };
}

export function useShowing(on = true) {
  useEffect(() => (on ? show() : undefined), [on]);
}

function HouseLights() {
  const down = useSyncExternalStore(house.subscribe, houseDown, () => false);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 bg-page"
      style={{ opacity: down ? HOUSE_LEVEL : 0 }}
    />
  );
}

function Grain({ className }: { className?: string }) {
  preload(GRAIN_TILE, { as: "image", fetchPriority: "high" });

  return (
    <div
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 z-0 size-full"}
      style={{
        backgroundImage: `url(${GRAIN_TILE})`,
        backgroundSize: `${GRAIN_SIZE}px`,
      }}
    />
  );
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
