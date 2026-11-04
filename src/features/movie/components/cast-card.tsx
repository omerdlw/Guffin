"use client";

import type { CSSProperties } from "react";
import { personHref } from "@/config/routes";
import { useArtworkPath } from "@/features/artwork";
import { DetailExpose, DetailPart } from "@/features/detail";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { MediaCard, RADIUS } from "@/ui";
import type { PersonEntry } from "../types";

// The foot of every card goes out of focus by degrees: layers of the picture
// behind them blurred twice as hard as the one before, each let through by a
// mask that overlaps its neighbours, so no step is ever seen. They blur what
// is behind them rather than copy it, so the card's edge stays solid.
const BLUR_STEPS = [0.5, 1, 2, 4, 8, 16] as const;

const blurLayer = (index: number): CSSProperties => {
  const step = 100 / (BLUR_STEPS.length + 1);
  const last = index === BLUR_STEPS.length - 1;
  return {
    "--blur": `${BLUR_STEPS[index]}px`,
    "--m0": `${index * step}%`,
    "--m1": `${(index + 1) * step}%`,
    "--m2": last ? "100%" : `${(index + 2) * step}%`,
    "--m3": last ? "100%" : `${(index + 3) * step}%`,
  } as CSSProperties;
};

// A credit as a portrait: the photo fills the card, its foot melts into blur,
// and the name and role are set on it. `index` is the card's place in its
// row, so the photo opens and the words are printed in turn with the others.
export function CastCard({
  index,
  person,
}: {
  index: number;
  person: PersonEntry;
}) {
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const src = tmdbImageUrl("profile", photoPath, "h632");

  const foot = (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
      >
        {BLUR_STEPS.map((blur, step) => (
          <div
            className="cast-blur absolute inset-0"
            key={blur}
            style={blurLayer(step)}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="cast-sheen pointer-events-none absolute inset-0"
      />
      <div className="absolute inset-x-0 bottom-0 flex min-w-0 flex-col px-2.5 pb-3 text-center drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]">
        <DetailExpose
          as="div"
          className="truncate type-control font-semibold text-ink-lead"
          index={index}
          part="name"
          text={person.name}
          truncate
        />
        <DetailExpose
          as="div"
          className="truncate type-meta font-medium text-ink-body"
          index={index}
          part="name"
          text={person.subtitle}
          truncate
        />
      </div>
    </>
  );

  return (
    <DetailPart index={index} name="photo">
      <MediaCard
        aspect="free"
        className="w-full"
        fallbackIcon="solar:user-bold"
        fallbackIconSize={24}
        frameClassName="aspect-[3/4] w-full"
        href={personHref(person.id)}
        image={{ sizes: "(min-width: 768px) 12vw, 44vw", src }}
        label={`${person.name}, ${person.subtitle}`}
        overlay={foot}
        radius={RADIUS.panel}
      />
    </DetailPart>
  );
}
