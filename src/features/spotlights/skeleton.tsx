import type { JSX } from "react";

export function SpotlightLoading(): JSX.Element {
  return (
    <main
      aria-hidden="true"
      className="ui-scene relative h-dvh overflow-hidden"
      data-cinematic
    >
      <div className="fixed inset-0 z-20 bg-black" />
    </main>
  );
}
