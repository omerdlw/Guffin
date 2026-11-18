import type { Curve, Enter, Look } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

// The legal pages' choreography: a document, so it reads rather than
// performs. The header is a short title card on φ cues (the eyebrow flickers
// in, the title settles a letter at a time, the intro surfaces word by word,
// the pills after it) and the rule draws across under it. Below, the index
// slides in from the margin and each section arrives as it comes into view:
// its heading first, its paragraphs rising one after another behind it.
// Nothing blurs.

const PHI = 1.618034;
// φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1, 1.618, 2.618.
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
// Fibonacci: staggers in ms, travel in px.
const STAGGER = { char: 0.034, word: 0.055, item: 0.089 };

// Settle: gathers softly, never with a jolt, and spends its long tail coming to rest.
const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
// Sweep: in and out on the same breath, for travel the eye follows.
const SWEEP: Curve = [0.618, 0, 0.382, 1];

const load = (from: Look, delay: number, duration = beat(1)): Enter => ({
  on: "load",
  from,
  delay,
  duration,
  ease: SETTLE,
});

const reveal = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "view",
  from,
  duration: beat(0),
  ease: SETTLE,
  ...more,
});

export const LEGAL = defineStage({
  scope: "legal",
  tempo: 1.272,
  reach: 1.618,
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
        text: {
          by: "char",
          order: "random",
          stagger: STAGGER.char,
          enter: load({ opacity: 0 }, beat(-2), beat(-1)),
        },
      },
      title: {
        text: {
          by: "char",
          stagger: STAGGER.char,
          enter: load({ opacity: 0, y: "0.236em", scale: 1.146 }, beat(-1)),
          line: beat(-2),
        },
      },
      intro: {
        text: {
          by: "word",
          stagger: STAGGER.word,
          budget: beat(0),
          enter: load({ opacity: 0, y: 8 }, beat(0), beat(0)),
        },
      },
      links: {
        enter: load({ opacity: 0, y: 13 }, beat(0) + beat(-1), beat(0)),
      },
      rule: {
        origin: "left center",
        enter: {
          ...load({ scale: [0, 1] }, beat(0) + beat(-2), beat(1)),
          ease: SWEEP,
        },
      },
      index: {
        enter: reveal({ opacity: 0, x: -21 }, { delay: beat(-2) }),
      },
      heading: {
        enter: reveal({ opacity: 0, y: 13 }, { along: "section" }),
      },
      prose: {
        enter: reveal(
          { opacity: 0, y: 13 },
          {
            along: "section",
            delay: beat(-2),
            stagger: STAGGER.item,
            wrap: 6,
          },
        ),
      },
    },
  },
});
