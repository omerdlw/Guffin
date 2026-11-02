"use client";

import { Suspense } from "react";
import { AwardFoil } from "@/features/awards";
import type { Awards } from "@/infrastructure/tmdb/types";
import { Tilt } from "@/motion/effects";
import { StagePart } from "@/motion/engine";
import { AdaptiveImage, Icon } from "@/ui";
import { artworkTarget } from "../hooks";

// A poster as a part of the page's score: it arrives by the part's own verb
// (or lands as the picture carried over from the page before), and once in
// the hand it leans toward the pointer. A film that won the Academy Award
// catches the light in foil.
export function ArtworkPrint({
  alt,
  awards,
  carry,
  className = "w-full shrink-0",
  fallbackIcon,
  frameClassName,
  part,
  path,
  src,
}: {
  alt: string;
  awards?: Promise<Awards | null>;
  carry?: string;
  className?: string;
  fallbackIcon: string;
  frameClassName: string;
  part: string;
  path: string | null;
  src: string | null;
}) {
  return (
    <Tilt
      className={className}
      frameClassName={`overflow-hidden ${frameClassName}`}
    >
      {(light) => (
        <StagePart
          carry={carry}
          className="absolute inset-0 overflow-hidden rounded-[inherit]"
          name={part}
        >
          <div className="absolute inset-0" {...artworkTarget("poster", path)}>
            <AdaptiveImage
              alt={alt}
              className="object-cover"
              fallback={
                <div className="center h-full w-full text-ink-faint ring-1 ring-edge ring-inset">
                  <Icon icon={fallbackIcon} size={40} />
                </div>
              }
              fetchPriority="high"
              loading="eager"
              sizes="(min-width: 1280px) 384px, (min-width: 1024px) 320px, 320px"
              src={src}
            />
          </div>
          {awards ? (
            <Suspense fallback={null}>
              <AwardFoil awards={awards} {...light} />
            </Suspense>
          ) : null}
        </StagePart>
      )}
    </Tilt>
  );
}
