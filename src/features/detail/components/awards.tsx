import type { JSX } from "react";
import { AwardsView, STAGE_LOOK, type AwardsGrouping } from "@/features/awards";
import type { Awards } from "@/infrastructure/tmdb/types";
import { DetailPart, DetailSection } from "../motion";
import { Heading } from "./heading";

export const hasAwards = (awards: Awards | null): awards is Awards =>
  awards !== null && awards.organizations.length > 0;

// The awards view: the page's honours, grouped the ways the page reads them.
export async function DetailAwards({
  awards,
  groupings,
  showRecipients = false,
}: {
  awards: Promise<Awards | null>;
  groupings: readonly AwardsGrouping[];
  showRecipients?: boolean;
}): Promise<JSX.Element | null> {
  const resolved = await awards;
  if (!hasAwards(resolved)) return null;

  return (
    <DetailSection className="flex w-full flex-col" cue="awards">
      <Heading icon="solar:cup-star-bold" title="Awards" />
      <DetailPart name="awards">
        <AwardsView
          awards={resolved}
          groupings={groupings}
          look={STAGE_LOOK}
          showRecipients={showRecipients}
        />
      </DetailPart>
    </DetailSection>
  );
}
