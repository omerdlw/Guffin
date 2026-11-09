"use client";

import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";

const DETAIL = defineScore({
  cast: {
    marquee: { matter: "plate", enter: "still", leave: "still" },
    backdrop: { matter: "plate", depth: 1 },
    title: { matter: "ink", enter: "still" },
    rule: { matter: "ink", enter: "wipe", leave: "fade" },
    tagline: "light",
    role: "light",
    overview: { matter: "ink", enter: "read", leave: "fade" },
    poster: { matter: "plate", enter: "door" },
    stat: { matter: "light", enter: "along", cadence: "even" },
    action: { matter: "glass", enter: "descend", cadence: "stairs" },
    proof: { matter: "glass", enter: "descend", cadence: "stairs" },
    row: { matter: "light", enter: "descend", cadence: "stairs" },
    link: "glass",
    label: "light",
    value: "light",
    line: { matter: "light", enter: "wipe" },
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
    readout: "light",
    bar: { matter: "light", enter: "door" },
    tick: "light",
    spine: "light",
    stamp: "light",
    entry: "paper",
  },
  opening: [
    ["marquee", "backdrop"],
    { rest: 1, with: "marquee" },
    "title",
    "rule",
    ["tagline", "role", "stat"],
    ["overview", "poster"],
    "action",
    ["proof", "link"],
    ["row", "label", "value", "line"],
  ],
  sections: {
    shelf: ["header"],
    cast: ["person", ["photo", "name"]],
    casting: [{ rest: 1 }, "person", ["photo", "name"]],
    slides: ["slide"],
    row: ["header", "slide"],
    digest: ["header", "review", "star"],
    board: ["header", "control"],
    reviews: ["review", "star"],
    lists: ["header", "list"],
    awards: ["header", "awards"],
    wall: ["header"],
    tiles: ["tile"],
    career: ["header", ["readout", "bar"], "tick"],
    chart: [["readout", "bar"], "tick"],
    timeline: ["header", "spine"],
    year: ["stamp", "entry"],
    episodes: ["header", "control", "entry", "name"],
    heatmap: ["header", ["readout", "tile"]],
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
export const useDetailAct = bound.useAct;
