"use client";

import { bindScore, defineScore } from "@/motion/engine";

// A film page: the picture is projected first and the room takes its color,
// the title is set under it, then the words with the poster beside them, the
// hand's buttons and the facts. Every section below plays as it is reached.
const MOVIE = defineScore({
  cast: {
    // The projected still, a step behind the page.
    backdrop: { matter: "plate", depth: 1 },
    title: "ink",
    rule: { matter: "ink", enter: "wipe", leave: "fade" },
    tagline: "light",
    overview: { matter: "ink", leave: "fade" },
    poster: { matter: "plate", enter: "door" },
    stat: "light",
    action: "glass",
    proof: "glass",
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
  },
  // The poster comes in with the overview, so the words under the title are
  // not held back by the plate's longer settle.
  opening: [
    "backdrop",
    "title",
    "rule",
    "tagline",
    ["overview", "poster", "stat"],
    ["action", "proof"],
    ["label", "value", "line"],
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
  },
});

const bound = bindScore(MOVIE);

export const MovieStageRoot = bound.StageRoot;
export const MoviePart = bound.Part;
export const MovieSection = bound.Section;
export const MovieText = bound.Text;
export const MovieHeader = bound.Header;
export const MovieExpose = bound.Expose;
export const MovieCount = bound.Count;
export const MovieSwap = bound.Swap;
export const MovieDeck = bound.Deck;
export const MovieWallStage = bound.WallStage;
export const useMoviePart = bound.usePart;
export const useMovieAct = bound.useAct;
