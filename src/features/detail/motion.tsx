"use client";

import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

// The detail page's choreography (movie, TV, their reviews and seasons; the
// person page shares the roles). Everything on the page that moves is written
// here; a role left out renders still.
//
// It runs on home's proportion, the golden ratio: durations are φⁿ seconds,
// staggers Fibonacci milliseconds, travel Fibonacci pixels, blur a Fibonacci
// radius, curves from φ's fractions.
//
// The opening plays in `order` (motion/stage.tsx, useQueue): the picture
// develops out of the dark as the room's light comes up; the title pulls
// into focus a letter at a time; the one-sheet is unveiled beside it; the
// rule is drawn under the title, and what sits at its ends (the person's
// role and profiles, the numbers) arrives along it; the tagline and the
// synopsis surface word by word.
//
// Everything else plays its own entrance the moment it comes into view,
// waiting for nothing, and only the first time: the actions pop
// up one after another; down the sidebar each fact slides in, its label
// flickers on and its value rises out of its line, and its rule is drawn;
// every heading lights its icon, resolves its title, draws its rule and
// shows its tabs; tabbed views (the cast, galleries, the wall, reviews, the
// chart) are dealt in from the right with their cards; rows deal their
// posters in with their arrows after; review stars light one after another.
// Switching a tab, the shown view leaves to the left before the next is
// dealt.
//
// Under the hand, a cast card's fan of posters opens wider and rises out of
// the card's foot, lighting from the middle outwards.

const PHI = 1.618034;
// φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1, 1.618, 2.618.
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

const load = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "load",
  from,
  duration: beat(0),
  ease: SETTLE,
  ...more,
});

const reveal = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "view",
  from,
  duration: beat(0),
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

// A text that surfaces word by word, like a subtitle (home's hero copy),
// spread over at most `budget` seconds however long it is.
const subtitle = (enter: (from: Look) => Enter, budget: number) => ({
  by: "word" as const,
  stagger: STAGGER.word,
  budget,
  enter: enter({ opacity: 0, y: 8, blur: BLUR.hint }),
});

// A heading, in order: its icon lights, its title resolves from the middle
// out while the icon settles, then the rule is drawn as the icon finishes
// and the tabs surface as the title finishes.
const HEADING = {
  icon: { at: 0, duration: beat(-1) },
  title: { at: beat(-4), duration: beat(-1), budget: beat(-2) },
  rule: { at: beat(-2), duration: beat(0) },
  actions: { at: beat(-1), duration: beat(-1) },
};

const DETAIL = defineStage({
  scope: "detail",
  order: [
    ["backdrop", "wash", "vignette"],
    "title",
    "poster",
    "rule",
    "role",
    "link",
    "stat",
    "kicker",
    "tagline",
    "overview",
    "more",
  ],
  scroll: { period: beat(0), gain: beat(-1) },
  glide: { duration: beat(1), ease: SWEEP },
  motion: {
    parts: {
      // The dive lands in the picture: it is already there, large and
      // soft, and settles into focus as it develops out of the dark.
      backdrop: {
        slots: {
          screen: {
            enter: load(
              { scale: 1.236, blur: BLUR.deep },
              {
                duration: beat(1),
                ease: DEVELOP,
              },
            ),
          },
          picture: {
            enter: load({ opacity: 0, bright: 0.382 }, { ease: DEVELOP }),
          },
        },
      },
      // The title pulls into focus a letter at a time like home's headline.
      title: {
        text: {
          by: "char",
          stagger: STAGGER.char,
          budget: beat(-1),
          enter: load({
            opacity: 0,
            y: "0.382em",
            scale: 1.236,
            blur: BLUR.lens,
          }),
        },
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
          { duration: beat(1), ease: DEVELOP },
        ),
      },
      // The room's light comes up with the picture.
      wash: {
        enter: load({ opacity: 0 }, { duration: beat(1), ease: DEVELOP }),
      },
      vignette: {
        enter: load({ opacity: 0 }, { duration: beat(1), ease: DEVELOP }),
      },
      rule: drawn(load({ scale: [0, 1] }, { ease: SWEEP })),
      // The person's role sits at the rule's left end and flickers on; their
      // profiles pop in along the right end.
      role: {
        text: {
          by: "char",
          order: "random",
          stagger: STAGGER.char / 2,
          budget: beat(-2),
          enter: load({ opacity: 0, blur: BLUR.hint }, { duration: beat(-1) }),
        },
      },
      link: {
        enter: load(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          {
            stagger: STAGGER.word,
            duration: beat(-1),
            ease: SPRING,
          },
        ),
        hover: { y: -3, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
        focus: "hover",
        press,
      },
      stat: {
        enter: load(
          { opacity: 0, x: 21, blur: BLUR.hint },
          {
            stagger: STAGGER.item,
            duration: beat(-1),
          },
        ),
      },
      // A season's line under its title (the show, its place in the run).
      kicker: {
        enter: load({ opacity: 0, y: 13, blur: BLUR.hint }),
      },
      tagline: { text: subtitle(load, beat(-2)) },
      overview: { text: subtitle(load, beat(0)) },
      // The biography's "read more" follows its excerpt.
      more: {
        enter: load(
          { opacity: 0, y: 8, blur: BLUR.hint },
          {
            duration: beat(-1),
          },
        ),
      },
      // The actions pop up out of the glass one after another: risen a
      // little, small and soft, they overshoot by a hair and settle.
      action: {
        enter: reveal(
          { opacity: 0, y: 13, scale: 0.854, blur: BLUR.lens },
          { stagger: STAGGER.item, ease: SPRING },
        ),
      },
      // Social proof under the actions surfaces after them.
      proof: {
        enter: reveal(
          { opacity: 0, y: 13, blur: BLUR.soft },
          { delay: beat(-2), ease: UNHURRIED },
        ),
      },
      // The facts, down the sidebar: each row slides in, its label flickers
      // on letter by letter, its value rises out of its own line word by
      // word, and the rule under it is drawn left to right.
      row: {
        enter: reveal(
          { opacity: 0, x: 13 },
          { stagger: STAGGER.word, duration: beat(-1), ease: UNHURRIED },
        ),
      },
      label: {
        text: {
          by: "char",
          order: "random",
          stagger: STAGGER.char / 2,
          budget: beat(-2),
          enter: reveal(
            { opacity: 0, blur: BLUR.hint },
            { delay: beat(-3), duration: beat(-1) },
          ),
        },
      },
      value: {
        text: {
          by: "word",
          mask: true,
          stagger: STAGGER.word,
          budget: beat(-2),
          enter: reveal({ y: "110%" }, { delay: beat(-2), duration: beat(-1) }),
        },
      },
      line: drawn(
        reveal(
          { scale: [0, 1] },
          { delay: beat(-2), stagger: STAGGER.word, ease: SWEEP },
        ),
      ),
      header: {
        text: {
          by: "char",
          order: "center",
          stagger: STAGGER.char,
          budget: HEADING.title.budget,
          enter: reveal(
            { opacity: 0, y: "0.382em", scale: 1.236, blur: BLUR.lens },
            { delay: HEADING.title.at, duration: HEADING.title.duration },
          ),
        },
        slots: {
          icon: {
            enter: reveal(
              { opacity: 0, scale: 0.382, rotate: -34, blur: BLUR.soft },
              { duration: HEADING.icon.duration, ease: SPRING },
            ),
          },
          rule: drawn(
            reveal(
              { scale: [0, 1] },
              {
                delay: HEADING.rule.at,
                duration: HEADING.rule.duration,
                ease: SWEEP,
              },
            ),
          ),
          // The heading's tabs or readout surface after its title.
          actions: {
            enter: reveal(
              { opacity: 0, x: 21, blur: BLUR.hint },
              {
                delay: HEADING.actions.at,
                duration: HEADING.actions.duration,
              },
            ),
          },
        },
      },
      control: {
        enter: reveal({ opacity: 0, x: 21, blur: BLUR.hint }),
      },
      // The cast, dealt as cards across the two columns. Each arrives
      // with its fan gathered behind its middle; the fan deals out of the
      // card's foot. The credits follow.
      person: {
        enter: reveal(
          { opacity: 0, y: 34, blur: BLUR.soft },
          { stagger: STAGGER.word, wrap: 2 },
        ),
        slots: {
          leaf: {
            enter: reveal(
              { opacity: 0, x: "-50%", y: 21, rotate: 0, scale: 0.809 },
              { delay: beat(-3), ease: SPRING },
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
          {
            delay: beat(-3),
            stagger: STAGGER.word,
            wrap: 2,
            duration: beat(-2),
          },
        ),
      },
      slide: {
        enter: reveal(
          { opacity: 0, x: 89, scale: 0.944, blur: BLUR.soft },
          { along: "section", stagger: STAGGER.word, wrap: 8 },
        ),
      },
      // A review card keeps still under the hand: it is not a control
      // itself (its links are), so it neither lifts nor presses.
      review: {
        enter: reveal(
          { opacity: 0, y: 55, blur: BLUR.soft },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      // Stars light one after another as their card settles.
      star: {
        enter: reveal(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          { delay: beat(-3), stagger: STAGGER.char, duration: beat(-2) },
        ),
      },
      list: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      awards: {
        enter: reveal({ opacity: 0, y: 34, blur: BLUR.soft }),
      },
      tile: {
        enter: reveal(
          { opacity: 0, y: 34, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.char, wrap: 8 },
        ),
      },
      // The career chart: the readout surfaces, the years fade in, and the
      // bars open out of the baseline.
      readout: {
        enter: reveal({ opacity: 0, y: 13, blur: BLUR.hint }),
      },
      tick: {
        enter: reveal({ opacity: 0 }),
      },
      // Each bar opens upwards out of the baseline, all together.
      bar: {
        enter: reveal(
          { clip: "inset(100% 0 0 0)" },
          { along: "section", ease: DEVELOP },
        ),
      },
      // The timeline: its spine is drawn down the page, each year's stamp
      // lands on it and its titles follow.
      spine: {
        origin: "center top",
        enter: reveal({ scale: [1, 0] }, { duration: beat(0), ease: SWEEP }),
      },
      // Stamps keep still in place (the dot is centred with `translate`).
      stamp: {
        enter: reveal(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          { ease: SPRING },
        ),
      },
      entry: {
        enter: reveal(
          { opacity: 0, x: -21, blur: BLUR.hint },
          { stagger: STAGGER.char / 2, wrap: 10 },
        ),
      },
    },
    sections: {
      // Switching the page's views (overview, awards, timeline), the view
      // shown slides in from the right and resolves.
      view: {
        enter: load({ opacity: 0, x: 34, blur: BLUR.soft }),
      },
      // Switching tabs, the shown view drifts off to the left and defocuses
      // before the next one is dealt in from the right.
      ...Object.fromEntries(
        (["cast", "slides", "tiles", "reviews", "chart"] as const).map(
          (cue) => [
            cue,
            {
              enter: reveal(
                { opacity: 0, x: 55, blur: BLUR.soft },
                { delay: beat(-3), duration: beat(1) },
              ),
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
      // A button rises to the hand and gives under it.
      button: {
        hover: { y: -2, scale: 1.034, duration: beat(-2), ease: SPRING },
        rest: { duration: beat(-1), ease: SETTLE },
        focus: "hover",
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
      // A row's arrows surface once its posters are under way.
      arrow: {
        enter: reveal(
          { opacity: 0, scale: 0.618, blur: BLUR.hint },
          { along: "section", delay: beat(-2), duration: beat(-2) },
        ),
        hover: { scale: 1.09, opacity: 1, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
        press: { ...press, scale: 0.91 },
      },
    },
  },
  parts: [
    "backdrop",
    "wash",
    "vignette",
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
