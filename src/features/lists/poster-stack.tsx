import type { JSX } from "react";
import { Image } from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/shared";

export const POSTER_STACK_SLOTS = 5;

export function PosterStack({
  className,
  paths,
}: {
  className?: string;
  paths: readonly (string | null)[];
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn("flex w-full rounded-thumb", className)}
    >
      {Array.from({ length: POSTER_STACK_SLOTS }, (_, index) => {
        const path = paths[index] ?? null;
        return (
          <div
            className="relative aspect-[2/3] w-[28%] shrink-0 overflow-hidden rounded-thumb bg-plate not-first:-ml-[10%]"
            key={index}
            style={{ zIndex: POSTER_STACK_SLOTS - index }}
          >
            {path ? (
              <Image
                alt=""
                className="object-cover"
                sizes="96px"
                src={tmdbImageUrl("poster", path, "w185")}
              />
            ) : null}
            <span className="absolute inset-0 rounded-[inherit] ring-1 ring-edge-hover ring-inset" />
          </div>
        );
      })}
    </div>
  );
}
