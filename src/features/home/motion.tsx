"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";
import { Room } from "@/motion/kit";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { cn } from "@/design/foundations/cn";
import { ambientImage } from "./utils";

/*
 * The home page is a programme: a gate that opens on the week's film, then a
 * running order of chapters. Each chapter is its own shape, so each has its
 * own beat; the score only says what a part is made of and who follows whom.
 */
const HOME = defineScore({
  cast: {
    backdrop: { matter: "plate", depth: 1 },
    reason: "light",
    tally: "light",
    count: { matter: "light", enter: "crisp", leave: "dim" },
    title: { matter: "ink", enter: "crisp", leave: "dim", drift: 1 },
    facts: "light",
    logline: { matter: "ink", leave: "fade" },
    open: "glass",
    social: "glass",
    reel: { matter: "paper", enter: "lift", cadence: "even" },
    header: { matter: "ink", enter: "still" },
    statement: { matter: "ink", enter: "crisp", leave: "dim", cadence: "even" },
    figure: "light",
    slide: { matter: "paper", enter: "door" },
    row: { matter: "paper", enter: "crisp", leave: "dim", cadence: "stairs" },
    bar: { matter: "light", enter: "wipe" },
    note: { matter: "ink", enter: "crisp" },
    lead: { matter: "ink", enter: "read", cadence: "even" },
    cover: { matter: "paper", enter: "crisp" },
    quote: { matter: "ink", enter: "crisp", cadence: "even" },
    byline: { matter: "ink", enter: "crisp" },
    review: "paper",
    list: "paper",
    member: "paper",
    rule: { matter: "light", enter: "wipe" },
    pitch: { matter: "ink", enter: "crisp", leave: "dim" },
    point: { matter: "light", enter: "descend", cadence: "stairs" },
  },
  opening: ["backdrop"],
  sections: {
    feature: [
      ["reason", "tally", "title"],
      ["facts", "logline"],
      ["open", "social"],
    ],
    reels: ["reel"],
    statement: ["figure", ["statement", "count"]],
    index: ["header", "row"],
    row: ["header", "slide"],
    shelf: ["header"],
    slides: ["slide"],
    reviews: ["header", ["cover", "quote"], "lead", "byline", "review"],
    rising: ["header", "row", "bar", "note"],
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

interface Lighting {
  glimpse: (src: string | null) => void;
  lead: (src: string | null) => void;
}

const LightContext = createContext<Lighting>({
  glimpse: () => {},
  lead: () => {},
});

/** The hero says which film the room is graded to. */
export const useHomeLead = () => use(LightContext).lead;

/** A film pointed at further down the page borrows the room for a moment. */
export const useHomeGlimpse = () => use(LightContext).glimpse;

export function HomeStage({
  backdrop,
  children,
}: {
  backdrop: string | null;
  children: ReactNode;
}) {
  const [lead, setLead] = useState<string | null>(null);
  const [glimpse, setGlimpse] = useState<string | null>(null);
  const lighting = useMemo(() => ({ glimpse: setGlimpse, lead: setLead }), []);

  return (
    <HomeStageRoot grade={glimpse ?? lead ?? ambientImage(backdrop)}>
      <Room black />
      <LightContext value={lighting}>{children}</LightContext>
    </HomeStageRoot>
  );
}

/**
 * A chapter's heading: the name set in the display face, then the rule and
 * whatever the chapter keeps by hand.
 */
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
