"use client";

import { Icon, TONE } from "@/ui";
import { DetailSection, Heading } from "@/features/detail";
import { Career } from "./career-chart";
import type { Career as CareerData } from "../types";
import { usePersonView } from "./view-state";

export function PersonCareer({ career }: { career: CareerData }) {
  const { openTimeline } = usePersonView();

  return (
    <DetailSection className="flex w-full flex-col" cue="career" now>
      <Heading
        actions={
          <button
            className={`hidden cursor-pointer items-center gap-1.5 sm:flex ${TONE.link}`}
            onClick={() => openTimeline(career.peak)}
            type="button"
          >
            In the timeline
            <Icon icon="solar:alt-arrow-right-linear" size={14} />
          </button>
        }
        icon="solar:chart-2-bold"
        title="Career"
      />
      <Career onOpen={openTimeline} peak={career.peak} years={career.years} />
    </DetailSection>
  );
}
