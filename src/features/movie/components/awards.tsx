import type { JSX } from "react";
import type { Awards } from "@/infrastructure/tmdb/types";
import { DetailAwards, hasAwards } from "@/features/detail";
import { AwardsAction } from "./collection-actions";

type AwardsRequest = Promise<Awards | null>;

export function MovieAwards({
  awards,
}: {
  awards: AwardsRequest;
}): JSX.Element {
  return (
    <DetailAwards
      awards={awards}
      groupings={["organizations", "timeline"]}
      showRecipients
    />
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
