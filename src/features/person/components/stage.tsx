"use client";

import type { ReactNode } from "react";
import { useArtworkPath } from "@/features/artwork";
import { DetailStage } from "@/features/detail";
import type { PersonDetails } from "@/infrastructure/tmdb/types";
import { personSwatch } from "../images";

// A person's room takes their backdrop, or else their photo.
export function PersonStage({
  backdrop,
  children,
  person,
}: {
  backdrop: string | null;
  children: ReactNode;
  person: Pick<PersonDetails, "id" | "profilePath">;
}) {
  const path = useArtworkPath("person", person.id, "backdrop", backdrop);
  const photo = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );

  return (
    <DetailStage picture={personSwatch(path, photo)}>{children}</DetailStage>
  );
}
