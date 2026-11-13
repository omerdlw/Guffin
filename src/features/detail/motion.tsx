"use client";

import { defineStage } from "@/motion/stage";

const DETAIL = defineStage({
  parts: [
    "backdrop",
    "title",
    "rule",
    "tagline",
    "role",
    "overview",
    "poster",
    "stat",
    "action",
    "proof",
    "row",
    "link",
    "label",
    "value",
    "line",
    "header",
    "person",
    "credit",
    "name",
    "slide",
    "control",
    "review",
    "star",
    "list",
    "awards",
    "tile",
    "readout",
    "bar",
    "tick",
    "spine",
    "stamp",
    "entry",
  ],
  sections: [
    "shelf",
    "cast",
    "casting",
    "slides",
    "row",
    "digest",
    "board",
    "reviews",
    "lists",
    "awards",
    "wall",
    "tiles",
    "career",
    "chart",
    "timeline",
    "year",
    "episodes",
  ],
});

const bound = DETAIL;

export const DetailStageRoot = bound.StageRoot;
export const DetailPart = bound.Part;
export const DetailSection = bound.Section;
export const DetailText = bound.Text;
export const DetailHeader = bound.Header;
export const DetailBloom = bound.Bloom;
export const DetailExpose = bound.Expose;
export const DetailCount = bound.Count;
export const DetailSwap = bound.Swap;
export const DetailDeck = bound.Deck;
export const DetailWallStage = bound.WallStage;
