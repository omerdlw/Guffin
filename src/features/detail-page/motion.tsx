"use client";

import type { Moves } from "@/motion/choreography/choreo";
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
  rise,
} from "@/motion/choreography/pace";
import { defineStage } from "@/motion/choreography/stage";

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

const HEADING = {
  rule: { at: beat(-6) },
  actions: { at: beat(-6) },
};

const soft: Moves = {
  enter: rise(1),
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
        enter: rise(2),
      },
      resume: {
        enter: rise(2),
        slots: {
          rule: {
            enter: rise(3),
          },
        },
      },
      proof: {
        enter: rise(2),
      },
      row: {
        enter: rise(2),
      },
      label: {
        enter: rise(3),
      },
      value: {
        enter: rise(2),
      },
      line: {
        enter: rise(3),
      },
      header: {
        enter: rise(2),
        slots: {
          icon: {
            enter: rise(3),
          },
          rule: {
            enter: rise(3, { delay: HEADING.rule.at }),
          },
          actions: {
            enter: rise(2, { delay: HEADING.actions.at }),
          },
        },
      },
      control: {
        enter: rise(2),
      },
      person: {
        enter: rise(1),
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
        enter: rise(2),
        hover: { y: -2, duration: beat(-3), ease: TOUCH },
        rest: { duration: beat(-2), ease: SETTLE },
      },
      credit: {
        enter: rise(2),
      },
      slide: {
        enter: rise(1),
      },
      review: {
        enter: rise(1),
      },
      star: {
        enter: rise(3),
      },
      list: {
        rest: { duration: beat(-1), ease: SETTLE },
        press,
        enter: rise(1),
      },
      awards: {
        enter: rise(1),
      },
      meter: {
        enter: rise(3),
      },
      laurel: {
        enter: rise(2),
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
        enter: rise(1),
      },
      readout: {
        enter: rise(2),
      },
      tick: {
        enter: rise(3),
      },
      bar: {
        enter: rise(3),
      },
      spine: {
        enter: rise(3),
      },
      trace: {
        follow: {
          of: ["translate", "width", "height", "opacity"],
          duration: beat(-2),
          ease: SETTLE,
        },
      },
      stamp: {
        enter: rise(2),
      },
      entry: {
        enter: rise(2),
      },
    },
    sections: {
      view: {
        enter: rise(1),
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
        enter: rise(3, { along: "section", delay: beat(-3) }),
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
