"use client";

import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.021, word: 0.034, item: 0.055, row: 0.089 };

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const DEVELOP: Curve = [0.382, 0, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];
const SPRING: Curve = [0.382, 0.618, 0.236, 1.146];

const AT = {
  picture: 0,
  kicker: beat(-5),
  title: beat(-5),
  poster: beat(-4),
  rule: beat(-3),
  along: beat(-3) + beat(-5),
  tagline: beat(-3) + beat(-5),
  overview: beat(-2),
  tags: beat(-2) + beat(-4),
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

const press = { scale: 0.96, duration: beat(-3), ease: PRESS };

const lift: Moves = {
  hover: { y: -5, duration: beat(-2), ease: TOUCH },
  rest: { duration: beat(-1), ease: SETTLE },
  press,
};

const drawn = (enter: Enter): Moves => ({ origin: "left center", enter });

const words = (enter: Enter, budget: number) => ({
  by: "word" as const,
  stagger: STAGGER.word,
  budget,
  enter,
});

const flicker = (enter: Enter) => ({
  by: "char" as const,
  order: "random" as const,
  stagger: STAGGER.char / 2,
  budget: beat(-4),
  enter,
});

const HEADING = {
  title: { at: beat(-5), budget: beat(-4) },
  rule: { at: beat(-4) },
  actions: { at: beat(-3) },
};

const dealt: Moves = {
  enter: reveal({ opacity: 0, x: 21 }, { duration: beat(-2) }),
  leave: { to: { opacity: 0, x: -21 }, duration: beat(-3), ease: LEAVE },
};

const DETAIL = defineStage({
  scope: "detail",
  opening: beat(-2),
  inset: 0.05,
  scroll: { period: beat(-1), gain: 1 },
  glide: { duration: beat(-1), ease: SWEEP },
  motion: {
    parts: {
      backdrop: {
        scroll: { to: { y: "13%" }, range: ["0px", "100vh"] },
        slots: {
          screen: {
            enter: load(
              { scale: 1.09 },
              { delay: AT.picture, duration: beat(0), ease: DEVELOP },
            ),
            scroll: { to: { scale: 1.055 }, range: ["0px", "100vh"] },
          },
          picture: {
            enter: load(
              { opacity: 0, bright: 0.382 },
              { delay: AT.picture, ease: DEVELOP },
            ),
          },
        },
      },
      vignette: {
        enter: load({ opacity: 0 }, { delay: AT.picture, ease: DEVELOP }),
      },
      kicker: {
        enter: load({ opacity: 0, y: 8 }, { delay: AT.kicker }),
      },
      title: {
        text: {
          by: "char",
          stagger: STAGGER.char,
          budget: beat(-3),
          enter: load(
            { opacity: 0, y: "0.382em" },
            { delay: AT.title, duration: beat(-1) },
          ),
        },
      },
      poster: {
        enter: load(
          { clip: "inset(100% 0 0 0)", y: 13, bright: 0.618 },
          { delay: AT.poster, ease: DEVELOP },
        ),
      },
      rule: drawn(load({ scale: [0, 1] }, { delay: AT.rule, ease: SWEEP })),
      role: {
        text: flicker(
          load({ opacity: 0 }, { delay: AT.along, duration: beat(-3) }),
        ),
      },
      link: {
        enter: load(
          { opacity: 0, scale: 0.786 },
          {
            delay: AT.along,
            stagger: STAGGER.word,
            duration: beat(-2),
            ease: SPRING,
          },
        ),
        hover: { y: -3, duration: beat(-3), ease: TOUCH },
        rest: { duration: beat(-2), ease: SETTLE },
        press,
      },
      stat: {
        enter: load(
          { opacity: 0, x: 13 },
          { delay: AT.along, stagger: STAGGER.item, duration: beat(-2) },
        ),
      },
      tagline: {
        text: words(
          load({ opacity: 0, y: 8 }, { delay: AT.tagline }),
          beat(-4),
        ),
      },
      overview: {
        text: words(
          load({ opacity: 0, y: 8 }, { delay: AT.overview }),
          beat(-3),
        ),
      },
      more: {
        enter: load({ opacity: 0, y: 8 }, { delay: AT.tags }),
      },
      tag: {
        enter: load(
          { opacity: 0, y: 8, scale: 0.854 },
          {
            delay: AT.tags,
            stagger: STAGGER.word,
            duration: beat(-2),
            ease: SPRING,
          },
        ),
      },
      action: {
        enter: reveal(
          { opacity: 0, y: 8, scale: 0.944 },
          { stagger: STAGGER.word, duration: beat(-2), ease: SPRING },
        ),
      },
      resume: {
        enter: reveal({ opacity: 0, y: 13 }, { delay: beat(-4) }),
        slots: {
          rule: drawn(
            reveal({ scale: [0, 1] }, { delay: beat(-3), ease: SWEEP }),
          ),
        },
      },
      proof: {
        enter: reveal({ opacity: 0, y: 13 }, { delay: beat(-4) }),
      },
      row: {
        enter: reveal(
          { opacity: 0, x: 8 },
          { stagger: STAGGER.word, duration: beat(-2) },
        ),
      },
      label: {
        text: flicker(reveal({ opacity: 0 }, { duration: beat(-3) })),
      },
      value: {
        text: {
          by: "word",
          mask: true,
          stagger: STAGGER.word,
          budget: beat(-4),
          enter: reveal({ y: "110%" }, { delay: beat(-5), duration: beat(-2) }),
        },
      },
      line: drawn(
        reveal(
          { scale: [0, 1] },
          { delay: beat(-5), stagger: STAGGER.word, ease: SWEEP },
        ),
      ),
      header: {
        text: {
          by: "char",
          order: "center",
          stagger: STAGGER.char,
          budget: HEADING.title.budget,
          enter: reveal(
            { opacity: 0, y: "0.382em" },
            { delay: HEADING.title.at, duration: beat(-2) },
          ),
        },
        slots: {
          icon: {
            enter: reveal(
              { opacity: 0, scale: 0.618, rotate: -21 },
              { duration: beat(-2), ease: SPRING },
            ),
          },
          rule: drawn(
            reveal({ scale: [0, 1] }, { delay: HEADING.rule.at, ease: SWEEP }),
          ),
          actions: {
            enter: reveal(
              { opacity: 0, x: 13 },
              { delay: HEADING.actions.at, duration: beat(-2) },
            ),
          },
        },
      },
      control: {
        enter: reveal({ opacity: 0, x: 13 }, { duration: beat(-2) }),
      },
      person: {
        enter: reveal(
          { opacity: 0, x: "var(--gather)", y: 13 },
          { stagger: STAGGER.item },
        ),
        follow: { of: ["flex-grow"], duration: beat(-1), ease: SETTLE },
        slots: {
          picture: {
            follow: { of: ["scale"], duration: beat(0), ease: SETTLE },
          },
          shade: {
            follow: { of: ["opacity"], duration: beat(-1), ease: SETTLE },
          },
          caption: {
            follow: { of: ["translate"], duration: beat(-2), ease: SETTLE },
            hover: {
              y: 0,
              duration: beat(-1),
              ease: SETTLE,
              delay: beat(-3),
            },
          },
          spine: {
            follow: {
              of: ["translate"],
              duration: beat(-1),
              ease: SETTLE,
              delay: beat(-3),
            },
            hover: { y: "-100%", duration: beat(-2), ease: SETTLE },
          },
          folder: {
            follow: {
              of: ["width", "height", "translate", "visibility"],
              duration: beat(-1),
              ease: SETTLE,
            },
          },
          leaf: {
            hover: {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: beat(-1),
              ease: SPRING,
              delay: beat(-4),
              stagger: STAGGER.word,
            },
            rest: { duration: beat(-3), ease: LEAVE },
          },
        },
      },
      cameo: {
        enter: reveal(
          { opacity: 0, y: 8 },
          { stagger: STAGGER.word, duration: beat(-2) },
        ),
        hover: { y: -2, duration: beat(-3), ease: TOUCH },
        rest: { duration: beat(-2), ease: SETTLE },
        slots: {
          thumb: {
            hover: {
              opacity: 1,
              scale: 1,
              duration: beat(-2),
              ease: SPRING,
            },
            rest: { duration: beat(-3), ease: SETTLE },
          },
        },
      },
      credit: {
        enter: reveal(
          { opacity: 0, y: 8 },
          { delay: beat(-4), stagger: STAGGER.word, duration: beat(-2) },
        ),
      },
      slide: {
        enter: reveal(
          { opacity: 0, x: 34 },
          { along: "section", stagger: STAGGER.word, wrap: 8 },
        ),
      },
      review: {
        enter: reveal(
          { opacity: 0, y: 21 },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      star: {
        enter: reveal(
          { opacity: 0, scale: 0.618 },
          { delay: beat(-4), stagger: STAGGER.char, duration: beat(-3) },
        ),
      },
      list: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 21 },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      awards: {
        enter: reveal({ opacity: 0, y: 13 }),
      },
      meter: drawn(reveal({ scale: [0, 1] }, { delay: beat(-4), ease: SWEEP })),
      laurel: {
        enter: reveal(
          { opacity: 0, y: 8 },
          { stagger: STAGGER.word, wrap: 12, duration: beat(-2) },
        ),
      },
      fold: {
        follow: {
          of: ["grid-template-rows", "opacity"],
          duration: beat(-2),
          ease: SETTLE,
        },
      },
      turn: {
        follow: { of: ["transform"], duration: beat(-2), ease: SETTLE },
      },
      tile: {
        enter: reveal(
          { opacity: 0, y: 13 },
          { stagger: STAGGER.char, wrap: 8 },
        ),
      },
      readout: {
        enter: reveal({ opacity: 0, y: 8 }, { duration: beat(-2) }),
      },
      tick: {
        enter: reveal({ opacity: 0 }, { duration: beat(-2) }),
      },
      bar: {
        enter: reveal(
          { clip: "inset(100% 0 0 0)" },
          { along: "section", ease: DEVELOP },
        ),
      },
      spine: {
        origin: "center top",
        enter: reveal(
          { scale: [1, 0] },
          { along: "section", duration: beat(0), ease: SWEEP },
        ),
      },
      trace: {
        follow: {
          of: ["translate", "width", "height", "opacity"],
          duration: beat(-2),
          ease: SETTLE,
        },
      },
      stamp: {
        enter: reveal(
          { opacity: 0, scale: 0.618 },
          { duration: beat(-2), ease: SPRING },
        ),
      },
      entry: {
        enter: reveal(
          { opacity: 0, x: -13 },
          { stagger: STAGGER.char, wrap: 10, duration: beat(-2) },
        ),
      },
    },
    sections: {
      view: {
        enter: load({ opacity: 0, x: 21 }, { duration: beat(-2) }),
      },
      cast: dealt,
      slides: dealt,
      tiles: dealt,
      reviews: dealt,
      chart: dealt,
    },
    kinds: {
      media: {
        press,
        rest: { duration: beat(-2), ease: SETTLE },
        slots: {
          image: {
            hover: { scale: 1.055, duration: beat(-1), ease: SETTLE },
            rest: { duration: beat(-1), ease: SETTLE },
          },
        },
      },
      button: {
        hover: { y: -2, scale: 1.034, duration: beat(-3), ease: SPRING },
        rest: { duration: beat(-2), ease: SETTLE },
        press,
      },
      segmented: {
        slots: {
          tab: {
            follow: { of: ["color"], duration: beat(-2), ease: SWEEP },
            press,
          },
        },
      },
      arrow: {
        enter: reveal(
          { opacity: 0, scale: 0.786 },
          { along: "section", delay: beat(-3), duration: beat(-3) },
        ),
        hover: { scale: 1.09, opacity: 1, duration: beat(-3), ease: TOUCH },
        rest: { duration: beat(-2), ease: SETTLE },
        press: { ...press, scale: 0.91 },
      },
    },
  },
  parts: [
    "backdrop",
    "vignette",
    "kicker",
    "title",
    "rule",
    "tagline",
    "role",
    "overview",
    "more",
    "tag",
    "poster",
    "stat",
    "action",
    "proof",
    "resume",
    "row",
    "link",
    "label",
    "value",
    "line",
    "header",
    "person",
    "cameo",
    "credit",
    "name",
    "slide",
    "control",
    "review",
    "star",
    "list",
    "awards",
    "meter",
    "laurel",
    "fold",
    "turn",
    "tile",
    "readout",
    "bar",
    "tick",
    "spine",
    "trace",
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
  ],
});

export const DetailStageRoot = DETAIL.StageRoot;
export const DetailPart = DETAIL.Part;
export const detailPart = DETAIL.usePart;
export const DetailSection = DETAIL.Section;
export const DetailText = DETAIL.Text;
export const DetailHeader = DETAIL.Header;
export const DetailBloom = DETAIL.Bloom;
export const DetailExpose = DETAIL.Expose;
export const DetailCount = DETAIL.Count;
export const DetailSwap = DETAIL.Swap;
export const DetailDeck = DETAIL.Deck;
export const DetailWallStage = DETAIL.WallStage;
