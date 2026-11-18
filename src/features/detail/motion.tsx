"use client";

import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";

// The detail page's choreography (movie, TV, their reviews and seasons; the
// person page shares the roles). Everything on the page that moves is written
// here; a role left out renders still.
//
// Quick and close to the hand. The opening is one short timeline, written
// as delays, that is done about a second after the name card dives into the
// picture: the picture settles, the title rises in, the one-sheet opens from
// its foot, the rule is drawn and what sits along it comes in, then the copy
// and the tags. What is already on screen beside it follows a beat behind.
//
// Everything else answers the scroll: a role plays the moment it comes onto
// the screen (`inset`), in about half a second and over a few pixels, so it
// has settled before it reaches the eye; it plays once. The picture drifts
// down and deepens as the page scrolls over it.
//
// Under the hand, a cast portrait opens in its strip while the others make
// room, a glass frame opens around it and its known-for posters surface
// under it.

const PHI = 1.618034;
// φⁿ seconds: 0.09, 0.146, 0.236, 0.382, 0.618, 1.
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.021, word: 0.034, item: 0.055, row: 0.089 };

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const DEVELOP: Curve = [0.382, 0, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
const PRESS: Curve = [0.382, 0, 0.236, 1];
// Spring: overshoots by a hair and settles, for things that pop.
const SPRING: Curve = [0.382, 0.618, 0.236, 1.146];

// The opening's timeline: seconds after the page starts to play.
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
  focus: "hover",
  press,
};

const drawn = (enter: Enter): Moves => ({ origin: "left center", enter });

// A text that comes up word by word, spread over at most `budget` seconds
// however long it is.
const words = (enter: Enter, budget: number) => ({
  by: "word" as const,
  stagger: STAGGER.word,
  budget,
  enter,
});

// A label that flickers on, letter by letter in no order.
const flicker = (enter: Enter) => ({
  by: "char" as const,
  order: "random" as const,
  stagger: STAGGER.char / 2,
  budget: beat(-4),
  enter,
});

// A heading: its icon pops, its title rises from the middle out, its rule
// is drawn and its tabs come in, all inside half a second.
const HEADING = {
  title: { at: beat(-5), budget: beat(-4) },
  rule: { at: beat(-4) },
  actions: { at: beat(-3) },
};

// A tab's view: dealt in from the right, gone to the left.
const dealt: Moves = {
  enter: reveal({ opacity: 0, x: 21 }, { duration: beat(-2) }),
  leave: { to: { opacity: 0, x: -21 }, duration: beat(-3), ease: LEAVE },
};

const DETAIL = defineStage({
  scope: "detail",
  // Roles in view on arrival (actions, facts, the first section) follow
  // the hero a beat behind; anything reached by scrolling plays at once.
  opening: beat(-2),
  // A role plays as soon as it is on the screen, not a sixth of the way up.
  inset: 0.05,
  scroll: { period: beat(-1), gain: 1 },
  glide: { duration: beat(-1), ease: SWEEP },
  motion: {
    parts: {
      // The dive lands in the picture: it is there, a little large, and
      // settles as it develops out of the dark. Scrolling, it drifts down
      // behind the page and closes in.
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
      wash: {
        enter: load({ opacity: 0 }, { delay: AT.picture, ease: DEVELOP }),
      },
      vignette: {
        enter: load({ opacity: 0 }, { delay: AT.picture, ease: DEVELOP }),
      },
      // A season's line above its title (the show, its place in the run).
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
      // The one-sheet opens from its foot, rising a little as it develops.
      poster: {
        enter: load(
          { clip: "inset(100% 0 0 0)", y: 13, bright: 0.618 },
          { delay: AT.poster, ease: DEVELOP },
        ),
      },
      rule: drawn(load({ scale: [0, 1] }, { delay: AT.rule, ease: SWEEP })),
      // Along the rule: the person's role flickers on at its left end,
      // their profiles and the numbers come in at its right.
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
        focus: "hover",
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
      // The biography's "read more" follows its excerpt.
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
      // The actions pop up out of the glass one after another.
      action: {
        enter: reveal(
          { opacity: 0, y: 8, scale: 0.944 },
          { stagger: STAGGER.word, duration: beat(-2), ease: SPRING },
        ),
      },
      // A show's "continue" card rises under the actions, its bar filling
      // to where the viewer is.
      resume: {
        enter: reveal({ opacity: 0, y: 13 }, { delay: beat(-4) }),
        slots: {
          rule: drawn(
            reveal({ scale: [0, 1] }, { delay: beat(-3), ease: SWEEP }),
          ),
        },
      },
      // Social proof under the actions.
      proof: {
        enter: reveal({ opacity: 0, y: 13 }, { delay: beat(-4) }),
      },
      // The facts down the sidebar: each row slides in, its label flickers
      // on, its value rises out of its line and its rule is drawn.
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
          // The heading's tabs or readout come in after its title.
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
      // The cast, dealt as a strip: each portrait starts gathered behind
      // the lead and is dealt out to its seat, the lead first. Under the
      // hand a seat opens and the others make room (its share of the strip
      // follows), its name turns from the spine to the foot, its glass
      // frame opens around it and down under it, and the person's posters
      // surface on the frame.
      person: {
        enter: reveal(
          { opacity: 0, x: "var(--gather)", y: 13 },
          { stagger: STAGGER.item },
        ),
        // The strip makes room on one settle; the picture pulls back on a
        // slower one, so the opening seems to keep breathing after it lands.
        follow: { of: ["flex-grow"], duration: beat(-1), ease: SETTLE },
        slots: {
          picture: {
            follow: { of: ["scale"], duration: beat(0), ease: SETTLE },
          },
          shade: {
            follow: { of: ["opacity"], duration: beat(-1), ease: SETTLE },
          },
          // One name at a time, each sliding through its own clip: opening,
          // the spine's name drops out downwards and the caption rises in
          // once the seat has mostly opened; closing, the caption sinks
          // away and the spine's name rises back as the seat narrows.
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
            },
            rest: { duration: beat(-2), ease: SETTLE },
            focus: "hover",
          },
        },
      },
      // The rest of the cast, rolled as an end credit under the strip;
      // under the hand a name's portrait opens below it.
      cameo: {
        enter: reveal(
          { opacity: 0, y: 8 },
          { stagger: STAGGER.word, duration: beat(-2) },
        ),
        hover: { y: -2, duration: beat(-3), ease: TOUCH },
        rest: { duration: beat(-2), ease: SETTLE },
        focus: "hover",
        slots: {
          thumb: {
            hover: {
              opacity: 1,
              scale: 1,
              duration: beat(-2),
              ease: SPRING,
            },
            rest: { duration: beat(-3), ease: SETTLE },
            focus: "hover",
          },
        },
      },
      credit: {
        enter: reveal(
          { opacity: 0, y: 8 },
          { delay: beat(-4), stagger: STAGGER.word, duration: beat(-2) },
        ),
      },
      // A row's posters come in from the right, a word's breath apart.
      slide: {
        enter: reveal(
          { opacity: 0, x: 34 },
          { along: "section", stagger: STAGGER.word, wrap: 8 },
        ),
      },
      // A review card keeps still under the hand: it is not a control
      // itself (its links are), so it neither lifts nor presses.
      review: {
        enter: reveal(
          { opacity: 0, y: 21 },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      // Stars light one after another as their card settles.
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
      // The awards board: the wins line is drawn, the rows come in one after
      // another; a row opens on one settle and its arrow turns with it.
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
      // The career chart: the readout comes in, the years fade in and the
      // bars open out of the baseline together.
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
      // The timeline: its spine is drawn down the page, each year's stamp
      // lands on it and its titles follow.
      // Drawn with its section: collapsed, the spine has no height for the
      // viewport to see, so it cannot be its own trigger.
      spine: {
        origin: "center top",
        enter: reveal(
          { scale: [1, 0] },
          { along: "section", duration: beat(0), ease: SWEEP },
        ),
      },
      // The timeline's one highlight, gliding from row to row under the hand.
      trace: {
        follow: {
          of: ["translate", "width", "height", "opacity"],
          duration: beat(-2),
          ease: SETTLE,
        },
      },
      // Stamps keep still in place (the dot is centred with `translate`).
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
      // Switching the page's views (overview, awards, timeline), the view
      // shown slides in from the right.
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
            focus: "hover",
          },
        },
      },
      // A button rises to the hand and gives under it.
      button: {
        hover: { y: -2, scale: 1.034, duration: beat(-3), ease: SPRING },
        rest: { duration: beat(-2), ease: SETTLE },
        focus: "hover",
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
      // A row's arrows come in once its posters are under way.
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
    "wash",
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
    "episodes",
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
