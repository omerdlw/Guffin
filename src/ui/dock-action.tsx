"use client";

import type { ReactNode } from "react";
import { SurfacePart, SurfaceStage } from "./surface-stage";
import { Unfold } from "./unfold";

// How an action arrives in the dock card: the card unfolds to make room for
// it and the action itself lifts in out of the soft, the way the search field
// does. Wrap what an action renders, not the node it is registered as: an
// action that is empty for a while (still loading) would unfold around
// nothing and then pop in at full height.
export function DockAction({ children }: { children: ReactNode }) {
  return (
    <SurfaceStage>
      <Unfold>
        <SurfacePart name="item">{children}</SurfacePart>
      </Unfold>
    </SurfaceStage>
  );
}
