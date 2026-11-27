"use client";

import {
  HERO,
  OPENING,
  TEMPO,
  beat,
  load,
  reveal,
} from "@/motion/choreography/pace";
import { defineStage } from "@/motion/choreography/stage";

const AT = {
  eyebrow: 0,
  title: beat(-5),
  intro: beat(-3),
  links: beat(-2),
  rule: HERO,
};

export const LEGAL = defineStage({
  scope: "legal",
  tempo: TEMPO,
  opening: OPENING,
  inset: 0.05,
  scroll: { period: beat(-1), gain: 1 },
  parts: [
    "eyebrow",
    "title",
    "intro",
    "links",
    "rule",
    "index",
    "heading",
    "prose",
  ],
  sections: ["block"],
  motion: {
    parts: {
      eyebrow: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.eyebrow }),
      },
      title: {
        enter: load({ opacity: 0, blur: 12 }, { delay: AT.title }),
      },
      intro: {
        enter: load({ opacity: 0, blur: 10 }, { delay: AT.intro }),
      },
      links: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.links }),
      },
      rule: {
        enter: load({ opacity: 0, blur: 6 }, { delay: AT.rule }),
      },
      index: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      heading: {
        enter: reveal({ opacity: 0, blur: 10 }),
      },
      prose: {
        enter: reveal({ opacity: 0, blur: 8 }),
      },
    },
  },
});
