import type { JSX } from "react";
import {
  SkeletonBlock,
  SkeletonLines,
  skeletonTextWidth,
} from "@/design/components/skeleton";
import { cn } from "@/design/foundations/cn";
import { SHOW_CANON_SIZE as CANON_SIZE, TUNNEL_SLOT_CLASS } from "./constants";

const DEPTHS = [0.82, 0.66, 0.52] as const;

export function TunnelSkeleton(): JSX.Element {
  return (
    <main
      id="main"
      aria-busy="true"
      aria-label="Loading the Top 100"
      className="ui-scene relative h-dvh overflow-hidden bg-page"
      data-cinematic
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[clamp(1.25rem,4.5svh,2.5rem)] left-4 z-10 flex flex-col gap-1 type-meta sm:left-8"
      >
        <SkeletonLines widths={[skeletonTextWidth("IMDb Top 100")]} />
        <SkeletonLines
          widths={[skeletonTextWidth("The countdown: No. 100 to No. 1")]}
        />
      </div>

      <div
        aria-hidden="true"
        className={cn(TUNNEL_SLOT_CLASS, "grid place-items-center")}
        style={{ containerType: "size" }}
      >
        {DEPTHS.map((depth) => (
          <span
            className="col-start-1 row-start-1 block rounded-card ring-1 ring-edge"
            key={depth}
            style={{
              height: `${depth * 100}cqh`,
              opacity: depth * 0.6,
              width: `${depth * 100}cqw`,
            }}
          />
        ))}
        <div
          className="relative col-start-1 row-start-1 aspect-[2/3] rounded-card bg-page"
          style={{ width: "min(100cqw, calc(100cqh * 2 / 3))" }}
        >
          <SkeletonBlock className="size-full rounded-card" />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--dock-h,6rem)+4.75rem)] z-10 flex flex-col items-center gap-2 sm:inset-x-8"
      >
        <SkeletonLines className="type-meta" widths={["3.25rem"]} />
        <div className="flex h-[1lh] items-center font-zuume type-display-sm leading-crop lg:type-display-md">
          <SkeletonBlock className="h-[0.7em] w-[min(18rem,70vw)] rounded-card" />
        </div>
        <SkeletonLines className="type-meta" widths={["14rem"]} />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--dock-h,6rem)+1.25rem)] z-10 px-4 sm:px-8"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="type-micro text-ink-muted tabular-nums">
            {CANON_SIZE}
          </span>
          <div className="flex h-9 min-w-0 flex-1 items-end gap-px">
            {Array.from({ length: CANON_SIZE }, (_, index) => (
              <span
                className="flex h-full min-w-0 flex-1 items-end justify-center"
                key={index}
              >
                <span className="block h-2 w-px rounded-full bg-fill-active" />
              </span>
            ))}
          </div>
          <span className="type-micro text-ink-muted tabular-nums">1</span>
        </div>
      </div>
    </main>
  );
}
