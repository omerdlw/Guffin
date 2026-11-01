import type { JSX } from "react";

// A spotlight opens in a black room and lights it itself, so while its data
// comes in the room is already there: the page's own first frame.
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
