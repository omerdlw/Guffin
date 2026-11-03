"use client";

import type { JSX } from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { SurfacePart, SurfaceProse, SurfaceStage } from "@/ui";

interface PersonBioData {
  biography: string;
  name: string;
}

const SURFACE_WIDTH = 560;

export function createPersonBioSurfaceEntry(data: PersonBioData): SurfaceEntry {
  return {
    component: PersonBioSurface,
    description: data.name,
    icon: "solar:document-text-bold",
    props: { data },
    title: "Biography",
    width: SURFACE_WIDTH,
  };
}

function PersonBioSurface({ data }: { data: PersonBioData }): JSX.Element {
  return (
    <SurfaceStage className="flex flex-col">
      <SurfacePart name="item">
        <SurfaceProse text={data.biography} />
      </SurfacePart>
    </SurfaceStage>
  );
}
