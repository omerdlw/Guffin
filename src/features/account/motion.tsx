"use client";

import { bindScore, defineScore } from "@/motion/engine";

// A member's page: their picture is projected and the room takes its color,
// the avatar develops beside their name, then the line under it, the tabs,
// and who follows them with their figures.
//
// What is under the tabs is not one block. It is a set of bands, each played
// as it is reached: its rule is drawn and its title lit, then what it holds
// arrives piece by piece (posters are dealt one after another, rows come down
// the page, the rating bars open up from their axis, the weeks of the year
// light up in turn). Going from one tab to another plays only the view again.
const ACCOUNT = defineScore({
  // Two columns of bands: those reached together are played top to bottom,
  // each starting as the eye finds it, in the rhythm of a film's page.
  ordered: true,
  cast: {
    // The member's background, a step behind the page.
    backdrop: { matter: "plate", depth: 1 },
    avatar: { matter: "paper", enter: "develop" },
    name: "ink",
    meta: "light",
    tabs: { matter: "glass", leave: "fade" },
    proof: "glass",
    stats: "light",

    // A tab that is still one block (diary, activity, lists): a page.
    page: { matter: "paper", leave: "fade" },

    // A band's heading: its rule is drawn out, its title and action lit.
    rule: { matter: "light", enter: "wipe", leave: "fade" },
    label: "light",
    // A shelf of posters, each coming up through its own door.
    tile: { matter: "paper", enter: "door" },
    // What a band holds, one after another down the page.
    row: "paper",
    // The ratings open up from their axis.
    bar: { matter: "light", enter: "door" },
    // The weeks of the year, lit from the oldest to the latest.
    week: { matter: "light", cadence: "even" },
    // The people they follow.
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

// Named one by one: a client module's exports must be plain declarations for
// server components to reach them.
const bound = bindScore(ACCOUNT);

export const AccountStageRoot = bound.StageRoot;
export const AccountPart = bound.Part;
export const AccountSection = bound.Section;
export const AccountText = bound.Text;
export const useAccountPart = bound.usePart;
export const useAccountStage = bound.useStage;
