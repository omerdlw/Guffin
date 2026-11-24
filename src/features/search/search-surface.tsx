"use client";

import type { JSX } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { defineSurface } from "@/design/surface-definition";
import { SearchAction } from "./search-action";

// Search opened from the compact dock: the same field and results, grown out
// of the compact row as a surface and folded back into it on close.
function SearchSurface(): JSX.Element {
  const { closeSurface } = useDockActions();
  return <SearchAction onClose={() => closeSurface?.()} />;
}

export const searchSurface = defineSurface({
  component: SearchSurface,
  description: "Movies, people, users, lists and reviews",
  icon: "solar:magnifer-linear",
  title: "Search",
});
