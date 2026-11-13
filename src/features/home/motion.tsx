"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";
import { cn } from "@/design/ui";
import { Room } from "@/design/components/room";
import { defineStage } from "@/motion/stage";
import { ambientImage } from "./feed";

const HOME = defineStage({
  parts: [
    "backdrop",
    "eyebrow",
    "headline",
    "copy",
    "actions",
    "credit",
    "header",
    "live",
    "poster",
    "verb",
    "slide",
    "cover",
    "quote",
    "lead",
    "byline",
    "review",
    "card",
    "rank",
    "list",
    "member",
    "rule",
    "close",
  ],
  sections: [
    "opening",
    "logged",
    "craft",
    "row",
    "shelf",
    "slides",
    "reviews",
    "popular",
    "canon",
    "lists",
    "members",
    "join",
  ],
});

const bound = HOME;

const HomeStageRoot = bound.StageRoot;
export const HomePart = bound.Part;
export const HomeSection = bound.Section;
export const HomeText = bound.Text;
const HomeHeader = bound.Header;
export const HomeSwap = bound.Swap;

interface Lighting {
  lead: (src: string | null) => void;
}

const LightContext = createContext<Lighting>({
  lead: () => {},
});

export const useHomeLead = () => use(LightContext).lead;

export function HomeStage({
  backdrop,
  children,
}: {
  backdrop: string | null;
  children: ReactNode;
}) {
  const [lead, setLead] = useState<string | null>(null);
  const lighting = useMemo(() => ({ lead: setLead }), []);

  return (
    <HomeStageRoot grade={lead ?? ambientImage(backdrop)}>
      <Room black />
      <LightContext value={lighting}>{children}</LightContext>
    </HomeStageRoot>
  );
}

export function Heading({
  actions,
  className,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <HomeHeader
      actions={actions}
      className={cn("relative z-10 mb-6 sm:mb-8", className)}
      nameClassName="min-w-0 font-zuume type-display-xs leading-none font-bold text-ink uppercase sm:type-display-sm"
      part="header"
      title={title}
    />
  );
}
