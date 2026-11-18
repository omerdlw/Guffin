"use client";

import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = {
  tick: 0.013,
  char: 0.034,
  word: 0.055,
  item: 0.089,
  row: 0.144,
};

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const DEVELOP: Curve = [0.382, 0, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];
const UNHURRIED: Curve = [0.236, 0.382, 0.146, 1];
const SPRING: Curve = [0.382, 0.618, 0.236, 1.146];

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

const press = { scale: 0.96, duration: beat(-3), ease: PRESS };

const nudge: Moves = {
  hover: { y: -3, duration: beat(-2), ease: TOUCH },
  rest: { duration: beat(-1), ease: SETTLE },
  focus: "hover",
  press,
};

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
  tempo: 1.272,
  reach: 1.618,
  opening: beat(2),
  scroll: { period: beat(0), gain: beat(-1) },
  motion: {
    parts: {
      backdrop: {
        slots: {
          screen: {
            enter: {
              on: "ready",
              from: { scale: 1.146 },
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
      tabs: {
        enter: load({ opacity: 0, y: -21 }, CUE.tabs),
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
      avatar: {
        enter: load({ opacity: 0, scale: 0.618 }, CUE.avatar, {
          ease: SPRING,
        }),
      },
      name: {
        text: {
          by: "char",
          order: "center",
          stagger: STAGGER.char,
          enter: load({ opacity: 0, y: "0.382em", scale: 1.236 }, CUE.name),
        },
      },
      meta: {
        enter: load({ opacity: 0, x: -13 }, CUE.meta, {
          stagger: STAGGER.row,
          ease: UNHURRIED,
        }),
      },
      proof: {
        enter: load({ opacity: 0, y: 8 }, CUE.proof),
      },
      stat: {
        ...nudge,
        enter: load({ opacity: 0, y: 13 }, CUE.stat, {
          stagger: STAGGER.item,
        }),
      },
      label: {
        enter: reveal({ opacity: 0, x: -13 }),
      },
      rule: {
        origin: "left center",
        enter: reveal(
          { scale: [0, 1] },
          { delay: beat(-2), duration: beat(2), ease: SWEEP },
        ),
      },
      tile: {
        enter: reveal(
          { opacity: 0, y: 34, scale: 0.944 },
          { stagger: STAGGER.word, wrap: 6 },
        ),
      },
      row: {
        enter: reveal(
          { opacity: 0, y: 21 },
          { delay: beat(-3), stagger: STAGGER.item, wrap: 6 },
        ),
      },
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
      face: {
        ...nudge,
        enter: reveal(
          { opacity: 0, scale: 0.618 },
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
      page: {
        enter: load({ opacity: 0, x: 34 }, 0, {
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
            hover: { scale: 1.146, duration: beat(1), ease: SETTLE },
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

export const AccountStageRoot = ACCOUNT.StageRoot;
export const AccountPart = ACCOUNT.Part;
export const AccountSection = ACCOUNT.Section;
export const AccountText = ACCOUNT.Text;
export const useAccountPart = ACCOUNT.usePart;
