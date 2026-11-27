"use client";

import type { Moves } from "@/motion/choreography/choreo";
import { defineStage } from "@/motion/choreography/stage";
import {
  DEVELOP,
  DOLLY,
  FOCUS,
  HERO,
  LEAVE,
  OPENING,
  PRESS,
  SETTLE,
  SPRING,
  SWEEP,
  TEMPO,
  TOUCH,
  beat,
  load,
  reveal,
} from "@/motion/choreography/pace";

const STAGGER = { char: 0.021, word: 0.034, item: 0.055, row: 0.089 };

const AT = {
  picture: 0,
  kicker: beat(-5),
  title: beat(-5),
  poster: beat(-5),
  rule: beat(-3),
  along: beat(-3) + beat(-5),
  tagline: beat(-2) + beat(-6),
  overview: beat(-2) + beat(-4),
  tags: HERO,
};

const press = { scale: 0.96, duration: beat(-3), ease: PRESS };

const lift: Moves = {
  hover: { y: -5, duration: beat(-2), ease: TOUCH },
  rest: { duration: beat(-1), ease: SETTLE },
  press,
};

const HEADING = {
  rule: { at: beat(-6) },
  actions: { at: beat(-6) },
};

const soft: Moves = {
  enter: reveal({ opacity: 0, blur: 12 }, { duration: beat(-1) }),
  leave: { to: { opacity: 0, blur: 8 }, duration: beat(-2), ease: SETTLE },
};

const DETAIL = defineStage({
  scope: "detail",
  tempo: TEMPO,
  opening: OPENING,
  inset: 0.05,
  scroll: { period: beat(-1), gain: 1 },
  glide: { duration: beat(-1), ease: SWEEP },
  motion: {
    parts: {
      backdrop: {
        scroll: { to: { y: "13%" }, range: ["0px", "100vh"] },
        slots: {
          screen: {
            origin: "center 38%",
            enter: load(
              { opacity: 0, scale: 1.236 },
              {
                delay: AT.picture,
                duration: beat(0) + beat(-2),
                ease: DOLLY,
              },
            ),
            scroll: { to: { scale: 1.055 }, range: ["0px", "100vh"] },
          },
          picture: {
            enter: load(
              { blur: 34, bright: 0.236, saturate: 0 },
              { delay: AT.picture, duration: beat(0), ease: FOCUS },
            ),
          },
        },
      },
      vignette: {
        enter: load({ opacity: 0 }, { delay: AT.picture, ease: DEVELOP }),
      },
      kicker: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.kicker }),
      },
      title: {
        enter: load({ opacity: 0, blur: 12 }, { delay: AT.title }),
      },
      poster: {
        enter: load({ opacity: 0, blur: 12 }, { delay: AT.poster }),
      },
      rule: {
        enter: load({ opacity: 0, blur: 6 }, { delay: AT.rule }),
      },
      role: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.along }),
      },
      link: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.along }),
        hover: { y: -3, duration: beat(-3), ease: TOUCH },
        rest: { duration: beat(-2), ease: SETTLE },
        press,
      },
      stat: {
        enter: load(
          { opacity: 0, blur: 8 },
          { delay: AT.along, stagger: STAGGER.item, duration: beat(-2) },
        ),
      },
      tagline: {
        enter: load({ opacity: 0, blur: 10 }, { delay: AT.tagline }),
      },
      overview: {
        enter: load({ opacity: 0, blur: 10 }, { delay: AT.overview }),
      },
      more: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.tags }),
      },
      tag: {
        enter: load(
          { opacity: 0, blur: 8 },
          { delay: AT.tags, stagger: STAGGER.char, duration: beat(-2) },
        ),
      },
      action: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      resume: {
        enter: reveal({ opacity: 0, blur: 8 }),
        slots: {
          rule: {
            enter: reveal({ opacity: 0, blur: 6 }),
          },
        },
      },
      proof: {
        enter: reveal({ opacity: 0, blur: 8 }),
      },
      row: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      label: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-3) }),
      },
      value: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      line: {
        enter: reveal({ opacity: 0, blur: 6 }),
      },
      header: {
        enter: reveal({ opacity: 0, blur: 10 }, { duration: beat(-2) }),
        slots: {
          icon: {
            enter: reveal({ opacity: 0, blur: 6 }, { duration: beat(-2) }),
          },
          rule: {
            enter: reveal({ opacity: 0, blur: 6 }, { delay: HEADING.rule.at }),
          },
          actions: {
            enter: reveal(
              { opacity: 0, blur: 8 },
              { delay: HEADING.actions.at, duration: beat(-2) },
            ),
          },
        },
      },
      control: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      person: {
        enter: reveal({ opacity: 0, blur: 12 }),
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
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
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
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      slide: {
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      review: {
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      star: {
        enter: reveal({ opacity: 0, blur: 6 }, { duration: beat(-3) }),
      },
      list: {
        ...lift,
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      awards: {
        enter: reveal({ opacity: 0, blur: 12 }),
      },
      meter: {
        enter: reveal({ opacity: 0, blur: 6 }),
      },
      laurel: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
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
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      readout: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      tick: {
        enter: reveal({ opacity: 0, blur: 6 }, { duration: beat(-2) }),
      },
      bar: {
        enter: reveal({ opacity: 0, blur: 6 }),
      },
      spine: {
        enter: reveal({ opacity: 0, blur: 6 }, { duration: beat(0) }),
      },
      trace: {
        follow: {
          of: ["translate", "width", "height", "opacity"],
          duration: beat(-2),
          ease: SETTLE,
        },
      },
      stamp: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      entry: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
    },
    sections: {
      view: {
        enter: reveal({ opacity: 0, blur: 12 }, { duration: beat(-1) }),
        leave: {
          to: { opacity: 0, blur: 8 },
          duration: beat(-2),
          ease: SETTLE,
        },
      },
      shelf: soft,
      cast: soft,
      slides: soft,
      row: soft,
      reviews: soft,
      board: soft,
      lists: soft,
      awards: soft,
      tiles: soft,
      chart: soft,
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
          { opacity: 0, blur: 6 },
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
