"use client";

import type { ReactNode } from "react";
import { DetailViews } from "@/features/detail";
import type { PersonViewKey } from "../types";
import { usePersonView } from "./view-state";

// A person's work, timeline and awards. Opening the timeline on a year lands
// on that year.
export function PersonViews({
  views,
}: {
  views: Record<PersonViewKey, ReactNode>;
}) {
  const { focusYear, view } = usePersonView();

  return (
    <DetailViews
      focus={focusYear === null ? null : `[data-year="${focusYear}"]`}
      shown={view}
      views={views}
    />
  );
}
