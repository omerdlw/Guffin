"use client";

import { bindScore, defineScore } from "@/motion/engine";

// A member's page: their picture is projected and the room takes its color,
// the avatar develops beside their name, then the line under it, the tabs,
// and who follows them with their figures. The page under the tabs changes
// in place: going from one tab to another plays only the view again.
const ACCOUNT = defineScore({
  cast: {
    // The member's background, a step behind the page.
    backdrop: { matter: "plate", depth: 1 },
    avatar: { matter: "paper", enter: "develop" },
    name: "ink",
    meta: "light",
    tabs: { matter: "glass", leave: "fade" },
    proof: "glass",
    stats: "light",
    view: { matter: "paper", leave: "fade" },
  },
  opening: ["backdrop", ["avatar", "name"], "meta", ["tabs", "proof", "stats"]],
  sections: { view: ["view"] },
});

// Named one by one: a client module's exports must be plain declarations for
// server components to reach them.
const bound = bindScore(ACCOUNT);

export const AccountStageRoot = bound.StageRoot;
export const AccountPart = bound.Part;
export const AccountText = bound.Text;
export const useAccountPart = bound.usePart;
export const useAccountStage = bound.useStage;
