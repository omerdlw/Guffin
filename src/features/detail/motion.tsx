"use client";

import { PAGE_TEMPO } from "@/motion/constants";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";

const DETAIL = defineScore({
  tempo: PAGE_TEMPO,
  ordered: true,
  tight: true,
  cast: {
    marquee: { matter: "plate", enter: "still", leave: "still" },
    backdrop: { matter: "plate", depth: 1 },
    title: { matter: "ink", enter: "still" },
    rule: { matter: "ink", enter: "wipe", leave: "fade" },
    tagline: "light",
    role: "light",
    overview: { matter: "ink", enter: "read", leave: "fade" },
    poster: { matter: "plate", enter: "unveil" },
    stat: { matter: "light", enter: "along", cadence: "stairs" },
    action: { matter: "glass", enter: "emerge", cadence: "stairs" },
    proof: { matter: "glass", enter: "emerge" },
    row: { matter: "ink", enter: "read", cadence: "lines" },
    link: { matter: "glass", enter: "emerge", cadence: "stairs" },
    label: { matter: "light", cadence: "lines" },
    value: { matter: "light", cadence: "lines" },
    line: { matter: "light", enter: "wipe", cadence: "lines" },
    header: { matter: "ink", enter: "still" },
    person: { matter: "paper", enter: "surface", cadence: "lines", beat: -2.5 },
    credit: { matter: "light", cadence: "lines", beat: -2.5 },
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
    "poster",
    "title",
    "role",
    "rule",
    { rest: 0, with: "rule" },
    ["stat", "link"],
    "tagline",
    "overview",
    { release: true },
    "action",
    "proof",
    { rest: 1 },
    ["row", "label", "value", "line"],
  ],
  sections: {
    shelf: ["header"],
    cast: ["person", "credit"],
    casting: [{ rest: 1 }, "person", "credit", { rest: 1 }],
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
