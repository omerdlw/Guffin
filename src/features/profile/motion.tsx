"use client";

import { PAGE_TEMPO } from "@/motion/constants";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";

/*
 * A profile opens in three movements, on the same tempo as every other page:
 *
 * 1. The backdrop (when there is one) lands, then the avatar is uncovered
 *    and settles while the name comes up; the handle and join date read in
 *    left to right, with the followed-by proof under them.
 * 2. As the proof lands the page begins: the tabs come up, the stats come
 *    in one cell at a time, and the first sections start.
 * 3. Sections play in page order, the main column and the sidebar
 *    interleaved from the top down; shelves clear in tile by tile like the
 *    search grid, and further sections play as they are scrolled to. A
 *    section is cued as soon as it is well into view.
 */
const ACCOUNT = defineScore({
  margin: "0px 0px -13% 0px",
  ordered: true,
  tight: true,
  tempo: PAGE_TEMPO,
  cast: {
    backdrop: { matter: "plate", depth: 1 },
    avatar: { matter: "plate", enter: "unveil" },
    name: { matter: "ink", enter: "crisp", leave: "dim" },
    meta: { matter: "light", enter: "along", cadence: "stairs" },
    proof: { matter: "glass", enter: "emerge" },
    tabs: { matter: "glass", enter: "emerge", leave: "fade" },
    stat: { matter: "glass", enter: "emerge", cadence: "stairs" },

    page: { matter: "paper", leave: "fade" },

    rule: { matter: "light", enter: "wipe", leave: "fade" },
    label: "light",
    tile: { matter: "paper", enter: "surface", cadence: "even" },
    row: { matter: "paper", enter: "read" },
    bar: { matter: "light", enter: "door" },
    week: { matter: "light", cadence: "even" },
    face: { matter: "paper", enter: "surface", cadence: "even" },
  },
  opening: [
    "backdrop",
    "avatar",
    "name",
    "meta",
    "proof",
    { release: true },
    ["tabs", "stat"],
  ],
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
