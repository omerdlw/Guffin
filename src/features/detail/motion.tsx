"use client";

import { bindScore, defineScore } from "@/motion/engine";

// A page about one film or one person: the picture is projected first and the
// room takes its color, the title is set under it, then the words with the
// poster beside them, the hand's buttons and the facts. Every section below
// plays as it is reached. Both pages play the same opening, so a part only
// one of them has is folded into a beat the other already plays.
const DETAIL = defineScore({
  cast: {
    // The title card the page opens on: the name alone in the middle, the
    // picture showing through its letters, then the dive into it (`Marquee`).
    // It holds the curtain, and only its arrival (the dive) is a movement.
    marquee: { matter: "plate", enter: "still", leave: "still" },
    // The projected still, a step behind the page.
    backdrop: { matter: "plate", depth: 1 },
    // A film's name or a person's: lit from the left by a sweep of light and
    // pulled into focus behind it (`Bloom`), so only the bloom moves.
    title: { matter: "ink", enter: "still" },
    rule: { matter: "ink", enter: "wipe", leave: "fade" },
    tagline: "light",
    // A person's trade, set by the rule where a film has its tagline.
    role: "light",
    // Prose is read as a wave, word after word.
    overview: { matter: "ink", enter: "read", leave: "fade" },
    poster: { matter: "plate", enter: "door" },
    // The sidebar is a staircase: each step comes down from above, one after
    // another, from the poster to the last fact.
    stat: { matter: "light", enter: "descend", cadence: "stairs" },
    action: { matter: "glass", enter: "descend", cadence: "stairs" },
    proof: { matter: "glass", enter: "descend", cadence: "stairs" },
    row: { matter: "light", enter: "descend", cadence: "stairs" },
    // A person's profiles, and the way to the whole biography.
    link: "glass",
    label: "light",
    value: "light",
    line: { matter: "light", enter: "wipe" },
    // The heading's own light crosses it; the part itself stays still.
    header: { matter: "ink", enter: "still" },
    person: "paper",
    photo: { matter: "paper", enter: "door" },
    name: "light",
    slide: { matter: "paper", enter: "door" },
    control: "glass",
    review: "paper",
    star: "light",
    list: "paper",
    awards: "light",
    tile: { matter: "paper", enter: "door" },
    // A career by year: the year read out, its bars opening up from the axis,
    // then the years along it.
    readout: "light",
    bar: { matter: "light", enter: "door" },
    tick: "light",
    // A timeline's spine, and each year's stamp and its films.
    spine: "light",
    stamp: "light",
    entry: "paper",
  },
  // The poster comes in with the overview, so the words under the title are
  // not held back by the plate's longer settle.
  // The picture develops behind the letters as the camera dives into them;
  // the page's own title is set once they have gone by. A page without a card
  // does not take that pause.
  opening: [
    ["marquee", "backdrop"],
    { rest: 1, with: "marquee" },
    "title",
    "rule",
    ["tagline", "role"],
    ["overview", "poster"],
    "stat",
    "action",
    ["proof", "link"],
    ["row", "label", "value", "line"],
  ],
  sections: {
    // A heading whose content is swapped in place below it.
    shelf: ["header"],
    cast: ["person", ["photo", "name"]],
    slides: ["slide"],
    // A heading over a row it owns.
    row: ["header", "slide"],
    digest: ["header", "review", "star"],
    board: ["header", "control"],
    reviews: ["review", "star"],
    lists: ["header", "list"],
    awards: ["header", "awards"],
    wall: ["header"],
    tiles: ["tile"],
    career: ["header", ["readout", "bar"], "tick"],
    timeline: ["header", "spine"],
    year: ["stamp", "entry"],
  },
});

const bound = bindScore(DETAIL);

export const DetailStageRoot = bound.StageRoot;
export const DetailPart = bound.Part;
export const DetailSection = bound.Section;
export const DetailText = bound.Text;
export const DetailHeader = bound.Header;
export const DetailBloom = bound.Bloom;
export const DetailMarquee = bound.Marquee;
export const DetailExpose = bound.Expose;
export const DetailCount = bound.Count;
export const DetailSwap = bound.Swap;
export const DetailDeck = bound.Deck;
export const DetailWallStage = bound.WallStage;
export const useDetailPart = bound.usePart;
export const useDetailAct = bound.useAct;
