"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";
import { cn } from "@/design/ui";
import { Room } from "@/design/components/room";
import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";
import { ambientImage } from "./feed";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { char: 0.034, word: 0.055, item: 0.089, row: 0.144 };

const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const DEVELOP: Curve = [0.382, 0, 0.146, 1];
const SWEEP: Curve = [0.618, 0, 0.382, 1];
const LEAVE: Curve = [0.618, 0, 0.854, 0.382];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
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

const press = { scale: 0.96, duration: beat(-3), ease: PRESS };

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

const titling = (
  enter: (from: Look) => Enter,
  order: "forward" | "center" = "forward",
) => ({
  by: "char" as const,
  order,
  stagger: STAGGER.char,
  enter: enter({ opacity: 0, y: "0.236em", scale: 1.146 }),
});

const subtitle = (enter: (from: Look) => Enter) => ({
  by: "word" as const,
  stagger: STAGGER.word,
  enter: enter({ opacity: 0, y: 8 }),
});

const flicker = (enter: (from: Look) => Enter) => ({
  by: "char" as const,
  order: "random" as const,
  stagger: STAGGER.char,
  enter: enter({ opacity: 0 }),
});

const HOME = defineStage({
  scope: "home",
  tempo: 1.272,
  reach: 1.618,
  scroll: { period: beat(0), gain: beat(-1) },
  glide: { duration: beat(1), ease: SWEEP },
  motion: {
    parts: {
      backdrop: {
        scroll: { to: { y: "21%", opacity: 0.146 }, range: ["0px", "100vh"] },
        slots: {
          screen: {
            enter: {
              on: "ready",
              from: { scale: 1.236 },
              duration: beat(3),
              ease: DEVELOP,
            },
            scroll: {
              to: { scale: 1.09 },
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
            load({ ...from, y: "0.382em", scale: 1.236 }, beat(0), beat(1)),
          ),
          line: beat(-2),
        },
      },
      copy: {
        text: subtitle((from) => load(from, beat(2), beat(1))),
      },
      actions: {
        enter: load({ opacity: 0, y: 21, scale: 0.944 }, beat(2) + beat(-1)),
      },
      credit: {
        enter: load({ opacity: 0, x: 34 }, beat(2) + beat(0)),
      },
      header: {
        text: titling((from) => reveal(from), "center"),
        slots: { rule: draw },
      },
      live: {
        enter: reveal({ opacity: 0, x: 21 }, { delay: beat(-1) }),
      },
      slide: {
        enter: reveal(
          { opacity: 0, x: 89, scale: 0.944 },
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
        enter: reveal({ opacity: 0, y: 55, scale: 0.944 }),
      },
      card: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, scale: 0.944 },
          { stagger: STAGGER.item, wrap: 6, duration: beat(1) },
        ),
      },
      rank: {
        ...nudge,
        enter: reveal(
          { opacity: 0, x: -34 },
          { stagger: STAGGER.word, wrap: 10 },
        ),
      },
      cover: {
        enter: reveal(
          { opacity: 0, scale: 1.146, bright: 0.618 },
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
        enter: reveal({ opacity: 0, y: 21 }, { delay: beat(0) + beat(-2) }),
      },
      review: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55 },
          { stagger: STAGGER.row, wrap: 3, duration: beat(1) },
        ),
      },
      list: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 55, scale: 0.944 },
          { stagger: STAGGER.row, wrap: 3, duration: beat(1) },
        ),
      },
      member: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 34, scale: 0.944 },
          { stagger: STAGGER.item, wrap: 4 },
        ),
      },
      verb: {
        enter: reveal({ opacity: 0, y: 34 }, { stagger: STAGGER.row, wrap: 3 }),
      },
      rule: draw,
      tag: { text: flicker((from) => reveal(from, { duration: beat(0) })) },
      finale: {
        text: titling((from) =>
          reveal(
            { ...from, y: "0.382em", scale: 1.236 },
            { delay: beat(-2), duration: beat(1) },
          ),
        ),
      },
      pitch: {
        text: subtitle((from) => reveal(from, { delay: beat(1) })),
      },
      cta: {
        enter: reveal({ opacity: 0, y: 21, scale: 0.944 }, { delay: beat(2) }),
      },
    },
    sections: {
      opening: {
        scroll: {
          to: { y: -144, opacity: 0 },
          range: ["5vh", "80vh"],
        },
      },
      slides: {
        enter: load({ opacity: 0, x: 55 }, beat(-3)),
        leave: {
          to: { opacity: 0, x: -55 },
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
            hover: { scale: 1.146, duration: beat(1), ease: SETTLE },
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
        enter: reveal(
          { opacity: 0, x: 21 },
          { along: "section", delay: beat(-1) },
        ),
        slots: {
          tab: {
            follow: { of: ["color"], duration: beat(-1), ease: SWEEP },
            press,
          },
        },
      },
      arrow: {
        enter: reveal(
          { opacity: 0, scale: 0.618 },
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

const HomeStageRoot = HOME.StageRoot;
export const HomePart = HOME.Part;
export const HomeSection = HOME.Section;
export const HomeText = HOME.Text;
const HomeHeader = HOME.Header;
export const HomeSwap = HOME.Swap;

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
    <HomeStageRoot light={lead ?? ambientImage(backdrop)}>
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
