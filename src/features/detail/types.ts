import type { ModalContainerProps } from "@omerdlw/base-framework/modules/modal";
import type { ReactNode } from "react";
import type { AwardRecipient } from "@/lib/tmdb/shared";
import type { SelectClassNames } from "@/ui/form";
import type { MediaCardAspect } from "@/ui/media";

export type AwardsGrouping = "organizations" | "projects" | "timeline";

export interface AwardItem {
  category: string;
  ceremony: string;
  key: string;
  mediaType: "movie" | "tv" | null;
  organizationId: string;
  organizationLogoPath: string | null;
  organizationTitle: string;
  posterPath: string | null;
  project: string | null;
  projectId: number | null;
  recipients: AwardRecipient[];
  won: boolean;
  year: string | null;
}

export interface AwardGroup {
  items: AwardItem[];
  key: string;
  logoPath: string | null;
  nominations: number;
  poster: {
    id: number | null;
    mediaType: "movie" | "tv" | null;
    path: string | null;
  } | null;
  title: string;
  wins: number;
}

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
  segmented?: string;
  select?: SelectClassNames;
}

export interface FactName {
  href?: string;
  text: string;
}

export interface Fact {
  label: string;
  value: (index: number) => ReactNode;
}

export interface StageWallSet {
  set: string | null;
  choose: (set: string) => void;
}

export type ImageModalData = {
  alt: string;
  src: string;
};

export interface ModalProps<T> {
  close: (result?: unknown) => void;
  data: T;
  header: ModalContainerProps["header"];
}
