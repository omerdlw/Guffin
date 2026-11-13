"use client";

import { type CSSProperties, type JSX, useEffect, useState } from "react";
import { PROFILE_CONTAINER_CLASS } from "@/features/profile/profile";

const ENABLED = process.env.NODE_ENV !== "production";

const INK = "rgb(88 166 255 / 0.55)";
const WASH = "rgb(88 166 255 / 0.05)";
const GOLD = "rgb(233 196 106 / 0.9)";

const EDGE: CSSProperties = {
  borderInline: `1px solid ${INK}`,
};

const LABEL: CSSProperties = {
  color: INK,
  font: "500 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

function Columns({ count, gap }: { count: number; gap: string }): JSX.Element {
  return (
    <div
      className="grid h-full"
      style={{ columnGap: gap, gridTemplateColumns: `repeat(${count}, 1fr)` }}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          style={{ background: WASH, borderInline: `1px dashed ${INK}` }}
        />
      ))}
    </div>
  );
}

function Sheet(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div className={`${PROFILE_CONTAINER_CLASS} h-full`}>
        <div
          className="plan relative h-full"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, rgb(88 166 255 / 0.14) 0 1px, transparent 1px var(--spacing-fib-6))`,
          }}
        >
          <div className="plan-main relative h-full" style={EDGE}>
            <Columns count={5} gap="var(--spacing-fib-3)" />
            <span className="absolute top-1 left-1" style={LABEL}>
              main · 1/φ
            </span>
          </div>

          <div
            className="relative hidden h-full lg:block"
            style={{
              background:
                "repeating-linear-gradient(135deg, rgb(88 166 255 / 0.2) 0 1px, transparent 1px 6px)",
              gridColumn: "cut-start / cut-end",
            }}
          >
            <span
              className="absolute inset-y-0 left-1/2"
              style={{ borderLeft: `1px dashed ${GOLD}` }}
            />
          </div>

          <div className="plan-aside relative h-full" style={EDGE}>
            <Columns count={6} gap="var(--spacing-fib-2)" />
            <span className="absolute top-1 right-1" style={LABEL}>
              aside · 1/φ²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanGuides(): JSX.Element | null {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!ENABLED) return;
    const toggle = (event: KeyboardEvent) => {
      if (event.key !== "G" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      setOn((current) => !current);
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);

  return ENABLED && on ? <Sheet /> : null;
}
