"use client";

import type { Curve, Enter, Look } from "@/motion/choreography/choreo";
import { defineStage } from "@/motion/choreography/stage";
import { HERO, OPENING, TEMPO } from "@/motion/choreography/pace";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];

const AT = {
  eyebrow: 0,
  title: beat(-5),
  intro: beat(-3),
  links: beat(-2),
  rule: HERO,
};

const load = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "load",
  from,
  duration: beat(-1),
  ease: SETTLE,
  ...more,
});

const reveal = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "view",
  from,
  duration: beat(-1),
  ease: SETTLE,
  ...more,
});

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
