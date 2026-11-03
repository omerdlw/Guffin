"use client";

import type { JSX } from "react";
import { TONE } from "@/ui";
import { whole } from "../format";
import type { Pulse } from "../types";
import { HomeCount, HomePart, HomeSection } from "../motion";

export function HomePulse({
  greeting,
  pulse,
}: {
  greeting: string | null;
  pulse: Pulse;
}): JSX.Element | null {
  if (pulse.members === 0) return null;
  const figures = [
    { label: "Films logged", value: pulse.logs },
    { label: "Different films", value: pulse.films },
    { label: "Reviews written", value: pulse.reviews },
    { label: "Members", value: pulse.members },
  ];
  return (
    <HomeSection className="flex w-full flex-col gap-5" cue="pulse">
      <HomePart className="flex flex-col gap-1" name="greeting">
        <h2 className="type-title font-semibold text-ink">
          {greeting ?? "This week on Guffin"}
        </h2>
        <p className="type-body text-ink-muted">
          {greeting
            ? "Here’s what your circle and the community have been watching."
            : "A film diary for people who love them. Here’s the last seven days."}
        </p>
      </HomePart>
      <div
        className={`grid grid-cols-2 divide-rule sm:grid-cols-4 sm:divide-x [&>div]:py-3 sm:[&>div]:px-6 sm:[&>div:first-child]:pl-0`}
      >
        {figures.map((figure, index) => (
          <div className="flex flex-col gap-1.5" key={figure.label}>
            <HomePart
              as="span"
              className={`${TONE.label} text-ink-muted`}
              index={index}
              name="figure"
            >
              {figure.label}
            </HomePart>
            <HomeCount
              className="font-zuume type-display-xs leading-none font-bold text-ink tabular-nums sm:type-display-sm"
              format={whole}
              hover
              index={index}
              part="count"
              value={figure.value}
            />
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
