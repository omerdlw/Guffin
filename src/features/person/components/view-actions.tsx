"use client";

import type { JSX } from "react";
import { DetailAction } from "@/features/detail";
import type { PersonViewKey } from "../types";
import { usePersonView } from "./view-state";

const ACTIONS: readonly {
  icon: { off: string; on: string };
  key: Exclude<PersonViewKey, "main">;
  label: string;
}[] = [
  {
    icon: { off: "solar:sort-by-time-linear", on: "solar:sort-by-time-bold" },
    key: "timeline",
    label: "Timeline",
  },
  {
    icon: { off: "solar:cup-star-linear", on: "solar:cup-star-bold" },
    key: "awards",
    label: "Awards",
  },
];

export function PersonViewActions(): JSX.Element | null {
  const { awards, hasTimeline, toggle, view } = usePersonView();
  const shown = ACTIONS.filter(({ key }) =>
    key === "timeline" ? hasTimeline : awards !== null,
  );
  if (shown.length === 0) return null;

  return (
    <div className="flex gap-3">
      {shown.map(({ icon, key, label }) => (
        <DetailAction
          active={view === key}
          grow
          hoverLabel={view === key ? "Back" : undefined}
          icon={icon}
          key={key}
          label={label}
          onClick={() => toggle(key)}
        />
      ))}
    </div>
  );
}
