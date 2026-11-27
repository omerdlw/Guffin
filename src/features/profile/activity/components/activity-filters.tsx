"use client";

import { type JSX, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TONES } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { ACTIVITY_GROUPS, ACTIVITY_PARAM, type ActivityGroup } from "../model";

const CHIP =
  "center h-control-sm rounded-full px-fib-3 type-control font-medium whitespace-nowrap";

export function ActivityFilters({
  base,
  group,
}: {
  base: string;
  group: ActivityGroup;
}): JSX.Element {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [chosen, setChosen] = useState(group);
  const [served, setServed] = useState(group);
  if (group !== served) {
    setServed(group);
    setChosen(group);
  }

  const choose = (key: ActivityGroup) => {
    if (key === chosen) return;
    setChosen(key);
    const href = key === "all" ? base : `${base}?${ACTIVITY_PARAM}=${key}`;
    startTransition(() => router.replace(href, { scroll: false }));
  };

  return (
    <nav
      aria-label="Kinds of activity"
      className="flex flex-wrap gap-fib-1"
      data-part="filters"
    >
      {(Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).map((key) => (
        <button
          aria-pressed={key === chosen}
          className={cn(
            CHIP,
            key === chosen
              ? TONES.chosen
              : "text-ink-muted hover:bg-fill hover:text-ink",
          )}
          key={key}
          onClick={() => choose(key)}
          type="button"
        >
          {ACTIVITY_GROUPS[key].label}
        </button>
      ))}
    </nav>
  );
}
