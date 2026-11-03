"use client";

import { ArtworkPrint, useArtworkPath } from "@/features/artwork";
import { DetailBackdrop } from "@/features/detail";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import { PERSON_FALLBACK_ICON } from "../constants";

export function PersonPortrait({
  awards,
  person,
}: {
  awards?: Promise<Awards | null>;
  person: Pick<PersonDetails, "id" | "name" | "profilePath">;
}) {
  const path = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );

  return (
    <ArtworkPrint
      alt={person.name}
      awards={awards}
      className="@container w-full shrink-0"
      fallbackIcon={PERSON_FALLBACK_ICON}
      frameClassName="h-[round(150cqw,1px)]"
      part="poster"
      path={path}
      src={tmdbImageUrl("profile", path, "h632")}
    />
  );
}

export function PersonBackdropHero({
  fallback,
  person,
}: {
  fallback: string | null;
  person: Pick<PersonDetails, "id" | "name">;
}) {
  const path = useArtworkPath("person", person.id, "backdrop", fallback);
  const image = tmdbImageUrl("backdrop", path, "original");
  return image ? <DetailBackdrop src={image} title={person.name} /> : null;
}
