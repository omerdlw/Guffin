import type { JSX } from "react";

// The tunnel draws itself in; until it does the page is the empty room.
export function TunnelSkeleton(): JSX.Element {
  return (
    <main
      id="main"
      aria-busy="true"
      aria-label="Loading the Top 100"
      className="ui-scene relative h-dvh overflow-hidden bg-page"
      data-cinematic
    />
  );
}
