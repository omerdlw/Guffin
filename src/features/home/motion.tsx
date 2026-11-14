"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";
import { cn } from "@/design/ui";
import { Room } from "@/design/components/room";
import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";
import { ambientImage } from "./feed";

// The home page's choreography. Everything on the page that moves is written
// here; a role left out renders still.
//
// One proportion runs the page: the golden ratio. Every duration and every
// cue is a power of φ seconds, every stagger a Fibonacci number of
// milliseconds, every travel a Fibonacci number of pixels, every blur a
// Fibonacci radius, every curve drawn from φ's fractions. Moves of one rank
// share one value, and each rank is φ times the one below, so nothing on the
// page fights for the eye at the same weight.
//
// The page is paced like a film, not a feed: the wheel travels φ⁻¹ of a
// notch and glides for a beat, and things arrive slightly out of focus and
// resolve, the way a lens pulls focus. Blur stays light (3–13px): enough to
// read as focus, cheap enough to keep scrolling smooth.
//
// The opening is a title sequence on φ cues. The picture develops out of the
// dark like a print in the bath over 4.2s. At 0.6s the eyebrow flickers in
// letter by letter; at 1s the headline pulls into focus a letter at a time,
// its second line 0.4s behind; at 2.6s the copy arrives word by word like a
// subtitle; the actions at 3.2s, the credit at 3.6s. Scrolling, the picture
// sinks, defocuses and fades while the titles lift away.
//
// Below, every block plays its entrance as it comes well into view: headings
// resolve from their middle outwards and draw their rule, rows deal their
// posters in from the right with their arrows and tabs after, grids cascade
// across a row, a review's words surface in reading order, and the credits
// roll at the foot. Switching a tab, the row leaves before the next is dealt.
// Touch is unhurried: a lift, a slow push into the picture, a firm press.

const PHI = 1.618034;
// φⁿ seconds: 0.146, 0.236, 0.382, 0.618, 1, 1.618, 2.618, 4.236.
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
// Fibonacci: staggers in ms, travel in px, blur radii.
const STAGGER = { char: 0.034, word: 0.055, item: 0.089, row: 0.144 };
const BLUR = { hint: 3, soft: 5, lens: 8, deep: 13 };

// Curves from φ's fractions (0.146, 0.236, 0.382, 0.618, 0.854).
// Settle: arrives quickly and spends its long tail coming to rest.
const SETTLE: Curve = [0.236, 1, 0.382, 1];
// Develop: a slow start and a long, even resolve, for pictures.
const DEVELOP: Curve = [0.382, 0, 0.146, 1];
// Sweep: in and out on the same breath, for travel the eye follows.
const SWEEP: Curve = [0.618, 0, 0.382, 1];
// Leave: gathers, then goes.
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
// Touch: answers at once and eases into place.
const TOUCH: Curve = [0.146, 1, 0.382, 1];
// Press: direct.
const PRESS: Curve = [0.382, 0, 0.236, 1];

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

const nudge: Moves = {
  hover: { x: 8, duration: beat(-1), ease: TOUCH },
  rest: { duration: beat(0), ease: SETTLE },
  focus: "hover",
};

const draw: Moves = {
  origin: "left center",
  enter: reveal(
    { scale: [0, 1] },
    { duration: beat(2), delay: beat(-2), ease: SWEEP },
  ),
};

// A text that resolves letter by letter from a little large and soft.
const titling = (
  enter: (from: Look) => Enter,
  order: "forward" | "center" = "forward",
) => ({
  by: "char" as const,
  order,
  stagger: STAGGER.char,
  enter: enter({ opacity: 0, y: "0.236em", scale: 1.146, blur: BLUR.soft }),
});

// A text that surfaces word by word, like a subtitle.
const subtitle = (enter: (from: Look) => Enter) => ({
  by: "word" as const,
  stagger: STAGGER.word,
  enter: enter({ opacity: 0, y: 8, blur: BLUR.hint }),
});

// A short label that flickers in letter by letter, scattered.
const flicker = (enter: (from: Look) => Enter) => ({
  by: "char" as const,
  order: "random" as const,
  stagger: STAGGER.char,
  enter: enter({ opacity: 0, blur: BLUR.hint }),
});

const HOME = defineStage({
  scope: "home",
  scroll: { period: beat(0), gain: beat(-1) },
  glide: { duration: beat(1), ease: SWEEP },
  motion: {
    parts: {
      backdrop: {
        scroll: { to: { y: "21%", opacity: 0.146 }, range: ["0px", "100vh"] },
        slots: {
          // Size and focus move on the clipping box, so its soft edges grow
          // with it; on the picture inside, a large picture would show the
          // box's hard edges until it settled.
          screen: {
            enter: {
              on: "ready",
              from: { scale: 1.236, blur: BLUR.deep },
              duration: beat(3),
              ease: DEVELOP,
            },
            scroll: {
              to: { scale: 1.09, blur: BLUR.soft },
              range: ["0px", "100vh"],
            },
          },
          picture: {
            enter: {
              on: "ready",
              from: { opacity: 0, bright: 0.236 },
              duration: beat(3),
              ease: DEVELOP,
            },
          },
        },
      },
      eyebrow: {
        text: flicker((from) => load(from, beat(-1), beat(0))),
      },
      headline: {
        text: {
          ...titling((from) =>
            load(
              { ...from, y: "0.382em", scale: 1.236, blur: BLUR.lens },
              beat(0),
              beat(1),
            ),
          ),
          line: beat(-2),
        },
      },
      copy: {
        text: subtitle((from) => load(from, beat(2), beat(1))),
      },
      actions: {
        enter: load(
          { opacity: 0, y: 21, scale: 0.944, blur: BLUR.soft },
          beat(2) + beat(-1),
        ),
      },
      credit: {
        enter: load({ opacity: 0, x: 34, blur: BLUR.soft }, beat(2) + beat(0)),
      },
      header: {
        text: titling((from) => reveal(from), "center"),
        slots: { rule: draw },
      },
      live: {
        enter: reveal(
          { opacity: 0, x: 21, blur: BLUR.hint },
          { delay: beat(-1) },
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
            duration: beat(1),
          },
        ),
      },
      poster: {
        enter: reveal({ opacity: 0, y: 55, scale: 0.944, blur: BLUR.soft }),
      },
      card: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.item, wrap: 6, duration: beat(1) },
        ),
      },
      rank: {
        ...nudge,
        enter: reveal(
          { opacity: 0, x: -34, blur: BLUR.hint },
          { stagger: STAGGER.word, wrap: 10 },
        ),
      },
      cover: {
        enter: reveal(
          { opacity: 0, scale: 1.146, blur: BLUR.lens, bright: 0.618 },
          { duration: beat(2), ease: DEVELOP },
        ),
        slots: {
          image: {
            hover: { scale: 1.055, duration: beat(1), ease: SETTLE },
            rest: { duration: beat(1), ease: SETTLE },
            focus: "hover",
          },
        },
      },
      lead: {
        text: subtitle((from) => reveal(from, { delay: beat(-2) })),
      },
      byline: {
        enter: reveal(
          { opacity: 0, y: 21, blur: BLUR.hint },
          { delay: beat(0) + beat(-2) },
        ),
      },
      review: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, blur: BLUR.soft },
          { stagger: STAGGER.row, wrap: 3, duration: beat(1) },
        ),
      },
      list: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.row, wrap: 3, duration: beat(1) },
        ),
      },
      member: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 34, scale: 0.944, blur: BLUR.soft },
          { stagger: STAGGER.item, wrap: 4 },
        ),
      },
      verb: {
        enter: reveal(
          { opacity: 0, y: 34, blur: BLUR.soft },
          { stagger: STAGGER.row, wrap: 3 },
        ),
      },
      rule: draw,
      // The credits roll: the tag, the title, then the pitch and the action,
      // each a φ step behind the last.
      tag: { text: flicker((from) => reveal(from, { duration: beat(0) })) },
      finale: {
        text: titling((from) =>
          reveal(
            { ...from, y: "0.382em", scale: 1.236, blur: BLUR.lens },
            { delay: beat(-2), duration: beat(1) },
          ),
        ),
      },
      pitch: {
        text: subtitle((from) => reveal(from, { delay: beat(1) })),
      },
      cta: {
        enter: reveal(
          { opacity: 0, y: 21, scale: 0.944, blur: BLUR.soft },
          { delay: beat(2) },
        ),
      },
    },
    sections: {
      opening: {
        scroll: {
          to: { y: -144, opacity: 0, blur: BLUR.soft },
          range: ["5vh", "80vh"],
        },
      },
      // Switching tabs, the shown row drifts off to the left and defocuses
      // before the next one is dealt in from the right.
      slides: {
        enter: load({ opacity: 0, x: 55, blur: BLUR.soft }, beat(-3)),
        leave: {
          to: { opacity: 0, x: -55, blur: BLUR.soft },
          duration: beat(-1),
          ease: LEAVE,
        },
      },
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
      // A section's tabs surface after its title. Choosing a tab, the pill
      // glides across under it and the labels cross-fade on the same beat.
      segmented: {
        enter: reveal(
          { opacity: 0, x: 21, blur: BLUR.hint },
          { along: "section", delay: beat(-1) },
        ),
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
      // A carousel's arrows wait for its posters to be dealt, then surface.
      // Showing and hiding as the row scrolls fades rather than pops.
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
    "eyebrow",
    "headline",
    "copy",
    "actions",
    "credit",
    "header",
    "live",
    "poster",
    "verb",
    "slide",
    "cover",
    "quote",
    "lead",
    "byline",
    "review",
    "card",
    "rank",
    "list",
    "member",
    "rule",
    "close",
    "finale",
    "tag",
    "pitch",
    "cta",
  ],
  sections: [
    "opening",
    "logged",
    "craft",
    "row",
    "shelf",
    "slides",
    "reviews",
    "popular",
    "canon",
    "lists",
    "members",
    "join",
  ],
});

const bound = HOME;

const HomeStageRoot = bound.StageRoot;
export const HomePart = bound.Part;
export const HomeSection = bound.Section;
export const HomeText = bound.Text;
const HomeHeader = bound.Header;
export const HomeSwap = bound.Swap;

interface Lighting {
  lead: (src: string | null) => void;
}

const LightContext = createContext<Lighting>({
  lead: () => {},
});

export const useHomeLead = () => use(LightContext).lead;

export function HomeStage({
  backdrop,
  children,
}: {
  backdrop: string | null;
  children: ReactNode;
}) {
  const [lead, setLead] = useState<string | null>(null);
  const lighting = useMemo(() => ({ lead: setLead }), []);

  return (
    <HomeStageRoot grade={lead ?? ambientImage(backdrop)}>
      <Room black />
      <LightContext value={lighting}>{children}</LightContext>
    </HomeStageRoot>
  );
}

export function Heading({
  actions,
  className,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <HomeHeader
      actions={actions}
      className={cn("relative z-10 mb-6 sm:mb-8", className)}
      nameClassName="min-w-0 font-zuume type-display-xs leading-none font-bold text-ink uppercase sm:type-display-sm"
      part="header"
      title={title}
    />
  );
}
