"use client";

import { useArtworkPath } from "@/features/artwork";
import { DetailIntermission } from "@/features/detail";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { PersonDetails } from "@/infrastructure/tmdb/types";
import { readable } from "@/motion/gl";

export function PersonProjection({
  backdrop,
  person,
}: {
  backdrop: string | null;
  person: Pick<PersonDetails, "id" | "name" | "profilePath">;
}) {
  const path = useArtworkPath("person", person.id, "backdrop", backdrop);
  const photo = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const picture = tmdbImageUrl("backdrop", path, "original");

  return (
    <DetailIntermission
      image={
        picture ? readable(picture) : tmdbImageUrl("profile", photo, "original")
      }
      title={person.name}
    />
  );
}
