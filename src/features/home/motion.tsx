"use client";

import { createContext, type ReactNode, use, useState } from "react";
import { Room } from "@/motion/kit";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { Icon } from "@/ui/media";
import { TONE } from "@/ui/tokens";
import { ambientImage } from "./utils";

const HOME = defineScore({
  cast: {
    backdrop: { matter: "plate", depth: 1 },
    reason: "light",
    title: "ink",
    facts: "light",
    logline: { matter: "ink", leave: "fade" },
    open: "glass",
    social: "glass",
    reel: "light",
    header: { matter: "ink", enter: "still" },
    slide: { matter: "paper", enter: "door" },
    greeting: "ink",
    figure: "light",
    count: "light",
    review: "paper",
    entry: "paper",
    list: "paper",
    member: "paper",
    rule: { matter: "light", enter: "wipe" },
    pitch: "ink",
    point: "light",
  },
  opening: ["backdrop"],
  sections: {
    feature: [
      ["reason", "title"],
      ["facts", "logline"],
      ["open", "social"],
    ],
    reels: ["reel"],
    pulse: ["greeting", ["figure", "count"]],
    row: ["header", "slide"],
    shelf: ["header"],
    slides: ["slide"],
    reviews: ["header", "review"],
    rising: ["header", "entry"],
    lists: ["header", "list"],
    members: ["header", "member"],
    join: ["rule", "pitch", "point"],
  },
});

const bound = bindScore(HOME);

const HomeStageRoot = bound.StageRoot;
export const HomePart = bound.Part;
export const HomeSection = bound.Section;
export const HomeText = bound.Text;
const HomeHeader = bound.Header;
export const HomeCount = bound.Count;
export const HomeSwap = bound.Swap;

const LeadContext = createContext<(src: string | null) => void>(() => {});

export const useHomeLead = () => use(LeadContext);

export function HomeStage({
  backdrop,
  children,
}: {
  backdrop: string | null;
  children: ReactNode;
}) {
  const [lead, setLead] = useState<string | null>(null);

  return (
    <HomeStageRoot grade={lead ?? ambientImage(backdrop)}>
      <Room />
      <LeadContext value={setLead}>{children}</LeadContext>
    </HomeStageRoot>
  );
}

export function Heading({
  actions,
  icon,
  title,
}: {
  actions?: ReactNode;
  icon: string;
  title: string;
}) {
  return (
    <HomeHeader
      actions={actions}
      icon={<Icon icon={icon} size={18} />}
      nameClassName={`min-w-0 ${TONE.label} text-ink-body`}
      part="header"
      title={title}
    />
  );
}
