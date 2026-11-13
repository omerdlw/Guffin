import type { ReactNode } from "react";
import type { MediaCardAspect } from "@/design/components/media-card";
import type { Awards } from "@/lib/tmdb/shared";

export type AwardsGrouping = "organizations" | "projects" | "timeline";

export interface WallPicture {
  crossOrigin?: "anonymous";
  full: string | null;
  lead: string | null;
  path: string;
  sizes?: string;
  src: string | null;
  srcSet?: string;
}

export interface WallSet {
  aspect: MediaCardAspect;
  key: string;
  label: string;
  noun: string;
  pictures: WallPicture[];
  slot: "backdrop" | "poster";
}

export interface AwardsLook {
  button?: string;
  logo?: string;
  poster?: string;
  shape?: "card" | "pill";
}

export interface FactName {
  href?: string;
  text: string;
}

export interface Fact {
  label: string;
  value: (index: number) => ReactNode;
}

export type ImageModalData = {
  alt: string;
  src: string;
};

export const WALL_SIZES: Record<"poster" | "video", string> = {
  poster:
    "(min-width: 1536px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw",
  video:
    "(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
};

export const SIDEBAR_FACTS_CLASS =
  "flex flex-col gap-6 sm:col-start-2 sm:max-lg:self-stretch lg:contents";

export const hasAwards = (awards: Awards | null): awards is Awards =>
  awards !== null && awards.organizations.length > 0;
