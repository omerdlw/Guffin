"use client";

import type { JSX } from "react";
import { SurfacePart, SurfaceStage } from "@/design/components/surface";
import { SurfaceProse } from "@/design/components/surface-prose";
import { defineSurface } from "@/design/surface-definition";

interface PersonBioData {
  biography: string;
  name: string;
}

const BIO_SURFACE_WIDTH = 560;

export const personBioSurface = defineSurface<{ data: PersonBioData }>({
  component: PersonBioSurface,
  description: ({ data }) => data.name,
  icon: "solar:document-text-bold",
  title: "Biography",
  width: BIO_SURFACE_WIDTH,
});

function PersonBioSurface({ data }: { data: PersonBioData }): JSX.Element {
  return (
    <SurfaceStage className="flex flex-col">
      <SurfacePart name="item">
        <SurfaceProse text={data.biography} />
      </SurfacePart>
    </SurfaceStage>
  );
}
