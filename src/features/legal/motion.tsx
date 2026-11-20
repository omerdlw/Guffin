import type { Curve, Enter, Look } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.021, item: 0.055 };

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];

const AT = {
  eyebrow: 0,
  title: beat(-5),
  intro: beat(-2),
  rule: beat(-3),
  links: beat(-2) + beat(-4),
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
  opening: beat(-2),
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
        enter: load({ opacity: 0, x: -8 }, { delay: AT.eyebrow }),
      },
      title: {
        text: {
          by: "char",
          stagger: STAGGER.char,
          budget: beat(-3),
          enter: load({ opacity: 0, y: "0.382em" }, { delay: AT.title }),
          line: beat(-4),
        },
      },
      intro: {
        enter: load({ opacity: 0, y: 8 }, { delay: AT.intro }),
      },
      links: {
        enter: load({ opacity: 0, y: 8 }, { delay: AT.links }),
      },
      rule: {
        origin: "left center",
        enter: load({ scale: [0, 1] }, { delay: AT.rule, ease: SWEEP }),
      },
      index: {
        enter: reveal(
          { opacity: 0, x: -13 },
          { delay: beat(-4), duration: beat(-2) },
        ),
      },
      heading: {
        enter: reveal({ opacity: 0, y: 8 }, { along: "section" }),
      },
      prose: {
        enter: reveal(
          { opacity: 0, y: 8 },
          {
            along: "section",
            delay: beat(-4),
            stagger: STAGGER.item,
            wrap: 6,
          },
        ),
      },
    },
  },
});
