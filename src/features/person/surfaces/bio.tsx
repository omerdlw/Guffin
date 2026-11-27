"use client";

import type { JSX } from "react";
import { defineSurface } from "@/design/surface/define";
import { SurfaceProse } from "@/design/surface/prose";
import { SurfacePart, SurfaceStage } from "@/design/surface/surface";

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
