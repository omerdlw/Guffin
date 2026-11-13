"use client";

import { defineStage } from "@/motion/stage";

const ACCOUNT = defineStage({
  parts: [
    "backdrop",
    "avatar",
    "name",
    "meta",
    "proof",
    "tabs",
    "stat",
    "page",
    "rule",
    "label",
    "tile",
    "row",
    "bar",
    "week",
    "face",
  ],
  sections: ["page", "shelf", "rows", "ratings", "activity", "faces"],
});

const bound = ACCOUNT;

export const AccountStageRoot = bound.StageRoot;
export const AccountPart = bound.Part;
export const AccountSection = bound.Section;
export const AccountText = bound.Text;
export const useAccountPart = bound.usePart;
