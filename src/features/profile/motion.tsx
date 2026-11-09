"use client";

import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";

/*
 * A profile is a place people work in, not a piece to sit through: everything
 * runs one beat faster than the default and a section is cued as soon as it
 * is well into view instead of waiting for the last third of the screen.
 */
const ACCOUNT = defineScore({
  margin: "0px 0px -13% 0px",
  ordered: true,
  tempo: -1,
  cast: {
    backdrop: { matter: "plate", depth: 1 },
    avatar: { matter: "paper", enter: "develop" },
    name: { matter: "ink", enter: "crisp", leave: "dim" },
    meta: "light",
    tabs: { matter: "glass", leave: "fade" },
    proof: "glass",
    stats: "light",

    page: { matter: "paper", leave: "fade" },

    rule: { matter: "light", enter: "wipe", leave: "fade" },
    label: "light",
    tile: { matter: "paper", enter: "door" },
    row: "paper",
    bar: { matter: "light", enter: "door" },
    week: { matter: "light", cadence: "even" },
    face: "paper",
  },
  opening: ["backdrop", ["avatar", "name"], "meta", ["tabs", "proof", "stats"]],
  sections: {
    page: ["page"],
    shelf: [
      ["rule", "label"],
      ["row", "tile"],
    ],
    rows: [["rule", "label"], "row"],
    ratings: [["rule", "label"], "row", "bar"],
    activity: [["rule", "label"], "week", "row"],
    faces: [["rule", "label"], "face"],
  },
});

const bound = bindScore(ACCOUNT);

export const AccountStageRoot = bound.StageRoot;
export const AccountPart = bound.Part;
export const AccountSection = bound.Section;
export const AccountText = bound.Text;
export const useAccountPart = bound.usePart;
export const useAccountStage = bound.useStage;
