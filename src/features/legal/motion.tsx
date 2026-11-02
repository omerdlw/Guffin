"use client";

import { bindScore, defineScore } from "@/motion/engine";

// A ledger page: quiet and quick. The title is set, the sheet is laid down,
// and each section comes up as it is reached.
const LEGAL = defineScore({
  tempo: -1,
  cast: {
    title: "ink",
    intro: "light",
    updated: "light",
    links: "glass",
    sheet: { matter: "paper", leave: "fade" },
    heading: "ink",
    prose: { matter: "ink", leave: "fade" },
  },
  opening: ["title", ["intro", "updated"], "links", "sheet"],
  sections: { block: ["heading", "prose"] },
});

// Named one by one: a client module's exports must be plain declarations for
// server components to reach them.
const bound = bindScore(LEGAL);

export const LegalStage = bound.StageRoot;
export const LegalPart = bound.Part;
export const LegalSection = bound.Section;
export const LegalHeadline = bound.Text;
