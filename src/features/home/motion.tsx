"use client";

import { bindScore, defineScore } from "@/motion/engine";

// The front page: the featured film is projected and the room takes its
// color, its words are set under it, then the reels beside them. Every row
// below plays as it is reached. A new feature swaps in place: the words go
// out by their own verbs and the next film's come up from the dark.
const HOME = defineScore({
  cast: {
    // The projected still, a step behind the page.
    backdrop: { matter: "plate", depth: 1 },
    reason: "light",
    title: "ink",
    facts: "light",
    logline: { matter: "ink", leave: "fade" },
    open: "glass",
    social: "glass",
    reel: "light",
    // The heading's own light crosses it; the part itself stays still.
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
    // The featured film's words, played right behind the projection.
    feature: [
      ["reason", "title"],
      ["facts", "logline"],
      ["open", "social"],
    ],
    reels: ["reel"],
    pulse: ["greeting", ["figure", "count"]],
    // A heading over a row it owns.
    row: ["header", "slide"],
    // A heading whose row is swapped in place below it.
    shelf: ["header"],
    slides: ["slide"],
    reviews: ["header", "review"],
    rising: ["header", "entry"],
    lists: ["header", "list"],
    members: ["header", "member"],
    join: ["rule", "pitch", "point"],
  },
});

// Named one by one: a client module's exports must be plain declarations for
// server components to reach them.
const bound = bindScore(HOME);

export const HomeStageRoot = bound.StageRoot;
export const HomePart = bound.Part;
export const HomeSection = bound.Section;
export const HomeText = bound.Text;
export const HomeHeader = bound.Header;
export const HomeCount = bound.Count;
export const HomeSwap = bound.Swap;
