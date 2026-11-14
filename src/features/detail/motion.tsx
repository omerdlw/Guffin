"use client";

import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

// The detail page's choreography (movie, TV, their reviews and seasons; the
// person page shares the roles). Everything on the page that moves is written
// here; a role left out renders still.
//
// It runs on home's proportion, the golden ratio: durations and cues are φⁿ
// seconds, staggers Fibonacci milliseconds, travel Fibonacci pixels, blur a
// Fibonacci radius, curves from φ's fractions.
//
// Home is a title sequence; this page is the film's one-sheet coming alive,
// and everything on it turns toward the film. The picture develops out of
// the dark; the title pulls into focus a letter at a time, like home's
// headline; the rule is drawn under it and the numbers arrive along it; the
// tagline and the synopsis surface word by word, like home's copy. The poster
// develops beside it, the actions surface one after another, and the facts
// are read down the sidebar a row at a time.
//
// Below, every block plays as it comes into view: headings resolve and draw
// their rule, the cast is dealt as folders, rows deal their posters in from
// the right with their arrows after, review stars light one after another,
// the wall's tiles arrive in a wave. Switching a tab, the shown view leaves
// to the left before the next is dealt.
//
// The cast folder opens under the hand: its back tips away, the deck inside
// stays upright and fans wider, rising, clearing and lighting from the middle
// outwards, and the frosted flap drops toward the reader.

const PHI = 1.618034;
// φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1, 1.618, 2.618, 4.236.
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.034, word: 0.055, item: 0.089, row: 0.144 };
const BLUR = { hint: 3, soft: 5, lens: 8, deep: 13 };

const SETTLE: Curve = [0.236, 1, 0.382, 1];
const DEVELOP: Curve = [0.382, 0, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const TOUCH: Curve = [0.146, 1, 0.382, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];
// Unhurried: an even arrival, without Settle's rush at the start, for the
// sidebar, which is read a piece at a time.
const UNHURRIED: Curve = [0.236, 0.618, 0.236, 1];
// Spring: overshoots by a hair and settles, for a hinge.
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

const lift: Moves = {
  hover: { y: -8, duration: beat(-1), ease: TOUCH },
  rest: { duration: beat(0), ease: SETTLE },
  focus: "hover",
  press,
};

const drawn = (enter: Enter): Moves => ({ origin: "left center", enter });

// A text that surfaces word by word, like a subtitle (home's hero copy).
const subtitle = (enter: (from: Look) => Enter) => ({
  by: "word" as const,
  stagger: STAGGER.word,
  enter: enter({ opacity: 0, y: 8, blur: BLUR.hint }),
});

const titling = (enter: (from: Look) => Enter) => ({
  by: "char" as const,
  order: "center" as const,
  stagger: STAGGER.char,
  enter: enter({ opacity: 0, y: "0.236em", scale: 1.146, blur: BLUR.soft }),
});

// Opening cues, in seconds after the name starts to leave. The camera has
// dived through the letters into the picture; the picture resolves around
// it, the poster rises beside it, and the title surfaces as the last letters
// fade.
const CUE = {
  poster: beat(-1),
  title: beat(0),
  rule: beat(0) + beat(-1),
  tagline: beat(0) + beat(-1),
  stat: beat(0) + beat(-1) + beat(-3),
  action: beat(1),
  overview: beat(1) + beat(-1),
  facts: beat(2),
};

// Hinges of the cast folder.
const hinge = (tilt: number): Omit<Moves, "slots" | "text"> => ({
  origin: "center bottom",
  hover: { tilt, duration: beat(-1), ease: SPRING },
  rest: { duration: beat(0), ease: SETTLE },
  focus: "hover",
});

const DETAIL = defineStage({
  scope: "detail",
  // The page reads from the top down: what is in view on arrival under the
  // opening (the cast, a row) waits until the synopsis has surfaced and the
  // facts begin down the sidebar.
  opening: CUE.facts,
  scroll: { period: beat(0), gain: beat(-1) },
  glide: { duration: beat(1), ease: SWEEP },
  motion: {
    parts: {
      // The dive lands in the picture: it is already there, large and
      // soft, and settles into focus.
      backdrop: {
        slots: {
          screen: {
            enter: load({ scale: 1.236, blur: BLUR.deep }, 0, {
              duration: beat(2),
              ease: DEVELOP,
            }),
          },
          picture: {
            enter: load({ opacity: 0, bright: 0.382 }, 0, {
              duration: beat(1),
              ease: DEVELOP,
            }),
          },
        },
      },
      // The title, tagline and synopsis open like home's hero: the title
      // pulls into focus a letter at a time like its headline, the tagline
      // and the synopsis surface word by word like its copy.
      title: {
        text: {
          by: "char",
          stagger: STAGGER.char,
          enter: load(
            { opacity: 0, y: "0.382em", scale: 1.236, blur: BLUR.lens },
            CUE.title,
          ),
        },
      },
      rule: drawn(
        load({ scale: [0, 1] }, CUE.rule, { duration: beat(2), ease: SWEEP }),
      ),
      stat: {
        enter: load({ opacity: 0, x: 21, blur: BLUR.hint }, CUE.stat, {
          stagger: STAGGER.item,
        }),
      },
      tagline: { text: subtitle((from) => load(from, CUE.tagline)) },
      // The person's role sits at the rule's left end and flickers on with
      // the tagline's cadence; their profiles pop in along the right end.
      role: {
        text: {
          by: "char",
          order: "random",
          stagger: STAGGER.char / 2,
          enter: load({ opacity: 0, blur: BLUR.hint }, CUE.tagline, {
            duration: beat(0),
          }),
        },
      },
      link: {
        enter: load({ opacity: 0, scale: 0.618, blur: BLUR.hint }, CUE.stat, {
          stagger: STAGGER.word,
          duration: beat(0),
          ease: SPRING,
        }),
        hover: { y: -3, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
        focus: "hover",
        press,
      },
      // A season's line under its title (the show, its place in the run).
      kicker: {
        enter: load({ opacity: 0, y: 13, blur: BLUR.hint }, CUE.tagline),
      },
      overview: { text: subtitle((from) => load(from, CUE.overview)) },
      // The biography's "read more" follows its excerpt.
      more: {
        enter: load(
          { opacity: 0, y: 8, blur: BLUR.hint },
          CUE.overview + beat(1),
        ),
      },
      // The one-sheet is unveiled from its foot upwards, rising a little
      // and developing as it opens.
      poster: {
        enter: load(
          {
            clip: "inset(100% 0 0 0)",
            y: 34,
            scale: 1.09,
            bright: 0.382,
          },
          CUE.poster,
          { duration: beat(2), ease: DEVELOP },
        ),
      },
      action: {
        enter: load(
          { opacity: 0, y: 21, scale: 0.944, blur: BLUR.soft },
          CUE.action,
          { stagger: STAGGER.row, duration: beat(2), ease: UNHURRIED },
        ),
      },
      // The facts are read down the sidebar a row at a time, each one's
      // rule drawn after it.
      row: {
        enter: load({ opacity: 0, x: 21, blur: BLUR.soft }, CUE.facts, {
          stagger: STAGGER.row,
          duration: beat(2),
          ease: UNHURRIED,
        }),
      },
      line: drawn(
        load({ scale: [0, 1] }, CUE.facts + beat(-1), {
          stagger: STAGGER.row,
          duration: beat(2),
          ease: SWEEP,
        }),
      ),
      header: {
        text: titling((from) => reveal(from)),
        slots: {
          // The heading's tabs or readout surface after its title.
          actions: {
            enter: reveal(
              { opacity: 0, x: 21, blur: BLUR.hint },
              { delay: beat(-1) },
            ),
          },
          rule: drawn(
            reveal(
              { scale: [0, 1] },
              { duration: beat(2), delay: beat(-2), ease: SWEEP },
            ),
          ),
        },
      },
      control: {
        enter: reveal(
          { opacity: 0, x: 21, blur: BLUR.hint },
          { delay: beat(-1) },
        ),
      },
      // The cast, dealt as folders across the two columns.
      // The cast, dealt as folders across the two columns. Each arrives
      // with its fan gathered behind the portrait; the fan deals out and the
      // flap swings up over the leaves' feet.
      person: {
        enter: reveal(
          { opacity: 0, y: 55, blur: BLUR.soft },
          { stagger: STAGGER.item, wrap: 2 },
        ),
        slots: {
          folder: hinge(15),
          deck: hinge(-15),
          flap: {
            ...hinge(-25),
            enter: reveal(
              { tilt: -55, opacity: 0 },
              { delay: beat(-1), duration: beat(1), ease: SPRING },
            ),
          },
          leaf: {
            enter: reveal(
              { opacity: 0, x: "-50%", y: 21, rotate: 0, scale: 0.809 },
              { delay: beat(-2), duration: beat(1), ease: SPRING },
            ),
            hover: {
              x: "calc(-50% + var(--fan-x) * 1.4)",
              y: "calc(var(--fan-y) - 13px)",
              rotate: "calc(var(--fan-r) * 1.3)",
              scale: "calc(var(--fan-s) * 1.02)",
              blur: 0,
              bright: "var(--fan-lit)",
              duration: beat(0),
              ease: SPRING,
            },
            rest: { duration: beat(0), ease: SETTLE },
            focus: "hover",
          },
        },
      },
      credit: {
        enter: reveal(
          { opacity: 0, y: 8, blur: BLUR.hint },
          { delay: beat(-1), stagger: STAGGER.item, wrap: 2 },
        ),
      },
      slide: {
        enter: reveal(
          { opacity: 0, x: 89, scale: 0.944, blur: BLUR.soft },
          {
            along: "section",
            delay: beat(-2),
            stagger: STAGGER.item,
            wrap: 8,
          },
        ),
      },
      review: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, blur: BLUR.soft },
          { stagger: STAGGER.row, wrap: 3 },
        ),
      },
      // Stars light one after another.
      star: {
        enter: reveal(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          { delay: beat(-1), stagger: STAGGER.word, duration: beat(0) },
        ),
      },
      list: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.row, wrap: 3 },
        ),
      },
      awards: {
        enter: reveal({ opacity: 0, y: 34, blur: BLUR.soft }),
      },
      tile: {
        enter: reveal(
          { opacity: 0, y: 34, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.word, wrap: 8 },
        ),
      },
      // The career chart: the readout surfaces, the baseline and the years
      // fade in, and the bars open out of the baseline.
      readout: {
        enter: reveal({ opacity: 0, y: 13, blur: BLUR.hint }),
      },
      tick: {
        enter: reveal({ opacity: 0 }, { delay: beat(-2), duration: beat(0) }),
      },
      // Each bar opens upwards out of the baseline, all together.
      bar: {
        enter: reveal(
          { clip: "inset(100% 0 0 0)" },
          {
            along: "section",
            delay: beat(-1),
            duration: beat(1),
            ease: DEVELOP,
          },
        ),
      },
      // The timeline: its spine is drawn down the page, each year's stamp
      // lands on it and its titles follow.
      spine: {
        origin: "center top",
        enter: reveal({ scale: [1, 0] }, { duration: beat(3), ease: SWEEP }),
      },
      // Stamps keep still in place (the dot is centred with `translate`).
      stamp: {
        enter: reveal(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          { duration: beat(0), ease: SPRING },
        ),
      },
      entry: {
        enter: reveal(
          { opacity: 0, x: -21, blur: BLUR.hint },
          { stagger: STAGGER.char, wrap: 10 },
        ),
      },
    },
    sections: {
      // Switching the page's views (overview, awards, timeline), the view
      // shown slides in from the right and resolves.
      view: {
        enter: load({ opacity: 0, x: 34, blur: BLUR.soft }, 0, {
          duration: beat(0),
        }),
      },
      // Switching tabs, the shown view drifts off to the left and defocuses
      // before the next one is dealt in from the right.
      ...Object.fromEntries(
        (["cast", "slides", "tiles", "reviews", "chart"] as const).map(
          (cue) => [
            cue,
            {
              enter: load({ opacity: 0, x: 55, blur: BLUR.soft }, beat(-3)),
              leave: {
                to: { opacity: 0, x: -55, blur: BLUR.soft },
                duration: beat(-1),
                ease: LEAVE,
              },
            } satisfies Moves,
          ],
        ),
      ),
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
      arrow: {
        enter: reveal(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          { along: "section", delay: beat(1) },
        ),
        hover: { scale: 1.09, opacity: 1, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
        press: { ...press, scale: 0.91 },
      },
    },
  },
  parts: [
    "backdrop",
    "kicker",
    "title",
    "rule",
    "tagline",
    "role",
    "overview",
    "more",
    "poster",
    "stat",
    "action",
    "proof",
    "row",
    "link",
    "label",
    "value",
    "line",
    "header",
    "person",
    "credit",
    "name",
    "slide",
    "control",
    "review",
    "star",
    "list",
    "awards",
    "tile",
    "readout",
    "bar",
    "tick",
    "spine",
    "stamp",
    "entry",
  ],
  sections: [
    "view",
    "shelf",
    "cast",
    "casting",
    "slides",
    "row",
    "digest",
    "board",
    "reviews",
    "lists",
    "awards",
    "wall",
    "tiles",
    "career",
    "chart",
    "timeline",
    "year",
    "episodes",
  ],
});

const bound = DETAIL;

export const DetailStageRoot = bound.StageRoot;
export const DetailPart = bound.Part;
export const DetailSection = bound.Section;
export const DetailText = bound.Text;
export const DetailHeader = bound.Header;
export const DetailBloom = bound.Bloom;
export const DetailExpose = bound.Expose;
export const DetailCount = bound.Count;
export const DetailSwap = bound.Swap;
export const DetailDeck = bound.Deck;
export const DetailWallStage = bound.WallStage;
