import type { JSX } from "react";
import { AwardsView, STAGE_LOOK } from "@/features/awards";
import { MoviePart, MovieSection } from "../motion";
import { Heading } from "./heading";
import type { Awards } from "@/infrastructure/tmdb/types";
import { AwardsAction } from "./collection-actions";

type AwardsRequest = Promise<Awards | null>;

const hasAwards = (awards: Awards | null): awards is Awards =>
  awards !== null && awards.organizations.length > 0;

export async function MovieAwards({
  awards,
}: {
  awards: AwardsRequest;
}): Promise<JSX.Element | null> {
  const resolved = await awards;
  if (!hasAwards(resolved)) return null;

  return (
    <MovieSection className="flex w-full flex-col" cue="awards">
      <Heading icon="solar:cup-star-bold" title="Awards" />
      <MoviePart name="awards">
        <AwardsView
          awards={resolved}
          groupings={["organizations", "timeline"]}
          look={STAGE_LOOK}
          showRecipients
        />
      </MoviePart>
    </MovieSection>
  );
}

export async function MovieAwardsAction({
  awards,
}: {
  awards: AwardsRequest;
}): Promise<JSX.Element | null> {
  if (!hasAwards(await awards)) return null;
  return <AwardsAction />;
}
