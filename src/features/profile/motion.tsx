"use client";

import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

// The account page's choreography (the profile and every tab under it).
// Everything on the page that moves is written here; a role left out renders
// still.
//
// It runs on home's proportion, the golden ratio: durations and cues are φⁿ
// seconds, staggers Fibonacci milliseconds, travel Fibonacci pixels, blur a
// Fibonacci radius, curves from φ's fractions.
//
// Detail is a film's one-sheet; this page is a member's card being handed
// over. The cover picture develops out of the dark, the tabs settle in at the
// top, the portrait swells into place, the name pulls into focus a letter at
// a time from its middle, and the handle and join date are read off after it.
// The counts arrive along the right, one after another.
//
// Below, each block plays as it comes into view: its label slides in and its
// rule is drawn, posters are dealt across the row, rows surface one after
// another, the rating bars open out of their baseline, the year of activity
// sweeps in week by week up to today, and the faces pop in. Choosing a tab,
// the pill glides to it and the new tab's page slides in from the right.

const PHI = 1.618034;
// φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1, 1.618, 2.618, 4.236.
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = {
  tick: 0.013,
  char: 0.034,
  word: 0.055,
  item: 0.089,
  row: 0.144,
};
const BLUR = { hint: 3, soft: 5, lens: 8, deep: 13 };

const SETTLE: Curve = [0.236, 1, 0.382, 1];
const DEVELOP: Curve = [0.382, 0, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const TOUCH: Curve = [0.146, 1, 0.382, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];
// Unhurried: an even arrival, without Settle's rush at the start, for lines
// read a piece at a time.
const UNHURRIED: Curve = [0.236, 0.618, 0.236, 1];
// Spring: overshoots by a hair and settles.
const SPRING: Curve = [0.236, 1.382, 0.382, 1];

const load = (from: Look, delay: number, more: Partial<Enter> = {}): Enter => ({
  on: "load",
  from,
  delay,
  duration: beat(1),
  ease: SETTLE,
  ...more,
});

const reveal = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "view",
  from,
  duration: beat(1),
  ease: SETTLE,
  ...more,
});

const press = { scale: 0.96, duration: beat(-4), ease: PRESS };

const nudge: Moves = {
  hover: { y: -3, duration: beat(-2), ease: TOUCH },
  rest: { duration: beat(-1), ease: SETTLE },
  focus: "hover",
  press,
};

// Opening cues, in seconds after the page is painted.
const CUE = {
  tabs: beat(-2),
  avatar: beat(-1),
  name: beat(-1) + beat(-3),
  meta: beat(0) + beat(-2),
  proof: beat(1),
  stat: beat(1) + beat(-2),
};

const ACCOUNT = defineStage({
  scope: "account",
  // What is in view on arrival below the hero waits until the counts have
  // begun along the right, so the card reads from the top down.
  opening: beat(2),
  scroll: { period: beat(0), gain: beat(-1) },
  motion: {
    parts: {
      // The cover develops out of the dark: large and soft, it settles into
      // focus once its picture has loaded.
      backdrop: {
        slots: {
          screen: {
            enter: {
              on: "ready",
              from: { scale: 1.146, blur: BLUR.deep },
              duration: beat(2),
              ease: DEVELOP,
            },
          },
          picture: {
            enter: {
              on: "ready",
              from: { opacity: 0, bright: 0.382 },
              duration: beat(1),
              ease: DEVELOP,
            },
          },
        },
      },
      // The tabs settle down from above the page.
      tabs: {
        enter: load({ opacity: 0, y: -21, blur: BLUR.soft }, CUE.tabs),
        slots: {
          pill: {
            follow: {
              of: ["transform", "translate", "width", "height"],
              duration: beat(-1),
              ease: SWEEP,
            },
          },
        },
      },
      // The portrait swells into place and overshoots by a hair.
      avatar: {
        enter: load({ opacity: 0, scale: 0.618, blur: BLUR.soft }, CUE.avatar, {
          ease: SPRING,
        }),
      },
      // The name pulls into focus a letter at a time, from its middle out.
      name: {
        text: {
          by: "char",
          order: "center",
          stagger: STAGGER.char,
          enter: load(
            { opacity: 0, y: "0.382em", scale: 1.236, blur: BLUR.lens },
            CUE.name,
          ),
        },
      },
      // The handle, the join date and the lock are read off after it.
      meta: {
        enter: load({ opacity: 0, x: -13, blur: BLUR.hint }, CUE.meta, {
          stagger: STAGGER.row,
          ease: UNHURRIED,
        }),
      },
      proof: {
        enter: load({ opacity: 0, y: 8, blur: BLUR.hint }, CUE.proof),
      },
      // The counts arrive along the right, one after another.
      stat: {
        ...nudge,
        enter: load({ opacity: 0, y: 13, blur: BLUR.soft }, CUE.stat, {
          stagger: STAGGER.item,
        }),
      },
      // A block's label slides in and its rule is drawn under it.
      label: {
        enter: reveal({ opacity: 0, x: -13, blur: BLUR.hint }),
      },
      rule: {
        origin: "left center",
        enter: reveal(
          { scale: [0, 1] },
          { delay: beat(-2), duration: beat(2), ease: SWEEP },
        ),
      },
      // Posters are dealt across the row.
      tile: {
        enter: reveal(
          { opacity: 0, y: 34, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.word, wrap: 6 },
        ),
      },
      // Rows surface one after another.
      row: {
        enter: reveal(
          { opacity: 0, y: 21, blur: BLUR.soft },
          { delay: beat(-3), stagger: STAGGER.item, wrap: 6 },
        ),
      },
      // The rating bars open out of their baseline, low ratings first.
      bar: {
        enter: reveal(
          { clip: "inset(100% 0 0 0)" },
          {
            along: "section",
            delay: beat(-1),
            stagger: STAGGER.char,
            ease: DEVELOP,
          },
        ),
      },
      // The year of activity sweeps in week by week, up to today.
      week: {
        origin: "center bottom",
        enter: reveal(
          { opacity: 0, scale: [1, 0.382] },
          {
            along: "section",
            delay: beat(-2),
            stagger: STAGGER.tick,
            duration: beat(0),
          },
        ),
      },
      // The faces pop in.
      face: {
        ...nudge,
        enter: reveal(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          {
            delay: beat(-2),
            stagger: STAGGER.word,
            wrap: 6,
            duration: beat(0),
            ease: SPRING,
          },
        ),
      },
    },
    sections: {
      // Choosing a tab, its page slides in from the right and resolves.
      page: {
        enter: load({ opacity: 0, x: 34, blur: BLUR.soft }, 0, {
          duration: beat(0),
        }),
      },
    },
    kinds: {
      media: {
        press,
        rest: { duration: beat(-1), ease: SETTLE },
        slots: {
          image: {
            hover: { scale: 1.09, duration: beat(1), ease: SETTLE },
            rest: { duration: beat(1), ease: SETTLE },
            focus: "hover",
          },
        },
      },
      button: {
        hover: { scale: 1.034, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
        press,
      },
      segmented: {
        slots: {
          pill: {
            follow: {
              of: ["transform", "translate", "width", "height"],
              duration: beat(-1),
              ease: SWEEP,
            },
          },
          tab: {
            follow: { of: ["color"], duration: beat(-1), ease: SWEEP },
            press,
          },
        },
      },
    },
  },
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
