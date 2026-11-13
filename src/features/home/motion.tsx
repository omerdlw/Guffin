"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";
import { cn } from "@/design/ui";
import { Room } from "@/motion/kit";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { PAGE_TEMPO } from "@/motion/time";
import { ambientImage } from "./utils";

const HOME = defineScore({
  margin: "0px 0px -13% 0px",
  ordered: true,
  tight: true,
  tempo: PAGE_TEMPO,
  cast: {
    backdrop: { matter: "plate", depth: 1 },
    eyebrow: "light",
    headline: { matter: "light", enter: "crisp", leave: "dim" },
    copy: { matter: "ink", enter: "read", leave: "fade" },
    actions: "glass",
    credit: "light",
    header: { matter: "ink", enter: "still" },
    live: "light",
    poster: { matter: "paper", enter: "lift", cadence: "even" },
    verb: { matter: "paper", enter: "crisp", leave: "dim", cadence: "even" },
    slide: { matter: "paper", enter: "door" },
    cover: { matter: "paper", enter: "crisp" },
    quote: { matter: "ink", enter: "crisp", cadence: "even" },
    lead: { matter: "ink", enter: "read", cadence: "even" },
    byline: { matter: "ink", enter: "crisp" },
    review: "paper",
    card: { matter: "paper", enter: "surface", cadence: "even" },
    rank: { matter: "paper", enter: "crisp", leave: "dim", cadence: "even" },
    list: { matter: "paper", enter: "surface", cadence: "even" },
    member: { matter: "paper", enter: "surface", cadence: "even" },
    rule: { matter: "light", enter: "wipe" },
    close: { matter: "ink", enter: "crisp", leave: "dim" },
  },
  opening: [{ release: true }, "backdrop"],
  sections: {
    opening: [["eyebrow", "headline"], "copy", ["actions", "credit"]],
    logged: ["header", ["live", "poster"]],
    craft: ["header", "verb"],
    row: ["header", "slide"],
    shelf: ["header"],
    slides: ["slide"],
    reviews: ["header", ["cover", "quote"], "lead", "byline", "review"],
    popular: ["header", "card"],
    canon: ["header", "rank"],
    lists: ["header", "list"],
    members: ["header", "member"],
    join: ["rule", "close"],
  },
});

const bound = bindScore(HOME);

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
