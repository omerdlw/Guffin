"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";
import { cn } from "@/design/ui";
import { Room } from "@/design/components/room";
import type { Curve, Enter, Look, Moves } from "@/motion/choreo";
import { defineStage } from "@/motion/stage";
import { ambientImage } from "./feed";

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

const LINEAR: Curve = [0, 0, 1, 1];

const AT = {
  eyebrow: 0,
  headline: beat(-5),
  meta: beat(-3),
  copy: beat(-2),
  actions: beat(-2) + beat(-4),
  picks: beat(-1),
};

const REEL_HOLD = beat(4) + beat(1);

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

const nudge: Moves = {
  hover: { x: 5, duration: beat(-2), ease: TOUCH },
  rest: { duration: beat(-1), ease: SETTLE },
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

const titling = (enter: Enter, order: "forward" | "center" = "forward") => ({
  by: "char" as const,
  order,
  stagger: STAGGER.char,
  budget: beat(-3),
  enter,
});

const HOME = defineStage({
  scope: "home",
  opening: beat(-2),
  inset: 0.05,
  scroll: { period: beat(-1), gain: 1 },
  glide: { duration: beat(-1), ease: SWEEP },
  motion: {
    parts: {
      backdrop: {
        scroll: { to: { y: "13%", opacity: 0.236 }, range: ["0px", "100vh"] },
        slots: {
          screen: {
            enter: {
              on: "ready",
              from: { scale: 1.09 },
              duration: beat(0),
              ease: DEVELOP,
            },
            scroll: { to: { scale: 1.055 }, range: ["0px", "100vh"] },
          },
          picture: {
            enter: {
              on: "ready",
              from: { opacity: 0, bright: 0.382 },
              duration: beat(-1),
              ease: DEVELOP,
            },
          },
        },
      },
      eyebrow: {
        text: flicker(
          load({ opacity: 0 }, { delay: AT.eyebrow, duration: beat(-3) }),
        ),
      },
      headline: {
        text: {
          ...titling(
            load({ opacity: 0, y: "0.382em" }, { delay: AT.headline }),
          ),
          line: beat(-4),
        },
      },
      copy: {
        text: words(load({ opacity: 0, y: 8 }, { delay: AT.copy }), beat(-4)),
      },
      actions: {
        enter: load(
          { opacity: 0, y: 8, scale: 0.944 },
          { delay: AT.actions, duration: beat(-2), ease: SPRING },
        ),
      },
      logo: {
        origin: "left bottom",
        enter: load(
          { opacity: 0, y: 13, scale: 0.944 },
          { delay: AT.headline, ease: SETTLE },
        ),
      },
      meta: {
        enter: load({ opacity: 0, y: 8 }, { delay: AT.meta }),
      },
      picks: {
        enter: load({ opacity: 0, x: 21 }, { delay: AT.picks }),
      },
      pick: {
        ...lift,
        enter: load(
          { opacity: 0, y: 13 },
          { delay: AT.picks, stagger: STAGGER.word, duration: beat(-2) },
        ),
        slots: {
          thumb: {
            follow: { of: ["opacity"], duration: beat(-1), ease: SETTLE },
          },
          image: {
            hover: { scale: 1.055, duration: beat(-1), ease: SETTLE },
            rest: { duration: beat(-1), ease: SETTLE },
          },
        },
      },
      tick: drawn(
        load({ scale: [0, 1] }, { duration: REEL_HOLD, ease: LINEAR }),
      ),
      mark: {
        enter: reveal(
          { opacity: 0, scale: 0.786 },
          { duration: beat(-2), ease: SPRING },
        ),
      },
      slice: {
        enter: reveal(
          { opacity: 0, x: 34 },
          { stagger: STAGGER.item, wrap: 8, duration: beat(0), ease: DEVELOP },
        ),
        slots: {
          image: {
            hover: { scale: 1.055, duration: beat(-1), ease: SETTLE },
            rest: { duration: beat(-1), ease: SETTLE },
          },
        },
      },
      header: {
        text: titling(
          reveal(
            { opacity: 0, y: "0.382em" },
            { delay: beat(-5), duration: beat(-2) },
          ),
          "center",
        ),
        slots: {
          rule: drawn(
            reveal({ scale: [0, 1] }, { delay: beat(-4), ease: SWEEP }),
          ),
        },
      },
      live: {
        enter: reveal(
          { opacity: 0, x: 13 },
          { delay: beat(-3), duration: beat(-2) },
        ),
      },
      slide: {
        enter: reveal(
          { opacity: 0, x: 34 },
          { along: "section", stagger: STAGGER.word, wrap: 8 },
        ),
      },
      poster: {
        enter: reveal({ opacity: 0, y: 13 }),
      },
      card: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 21 },
          { stagger: STAGGER.item, wrap: 6 },
        ),
      },
      rank: {
        ...nudge,
        enter: reveal(
          { opacity: 0, x: -13 },
          { stagger: STAGGER.word, wrap: 10, duration: beat(-2) },
        ),
      },
      cover: {
        enter: reveal(
          { opacity: 0, scale: 1.055, bright: 0.618 },
          { duration: beat(0), ease: DEVELOP },
        ),
        slots: {
          image: {
            hover: { scale: 1.055, duration: beat(-1), ease: SETTLE },
            rest: { duration: beat(-1), ease: SETTLE },
          },
        },
      },
      lead: {
        text: words(
          reveal({ opacity: 0, y: 8 }, { delay: beat(-4) }),
          beat(-3),
        ),
      },
      byline: {
        enter: reveal({ opacity: 0, y: 8 }, { delay: beat(-3) }),
      },
      review: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 21 },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      list: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 21 },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      member: {
        ...lift,
        enter: reveal(
          { opacity: 0, y: 13, scale: 0.944 },
          { stagger: STAGGER.word, wrap: 4, duration: beat(-2), ease: SPRING },
        ),
      },
      verb: {
        enter: reveal(
          { opacity: 0, y: 13 },
          { stagger: STAGGER.item, wrap: 3 },
        ),
      },
      rule: drawn(reveal({ scale: [0, 1] }, { delay: beat(-4), ease: SWEEP })),
      tag: { text: flicker(reveal({ opacity: 0 }, { duration: beat(-3) })) },
      finale: {
        text: titling(
          reveal({ opacity: 0, y: "0.382em" }, { delay: beat(-5) }),
        ),
      },
      pitch: {
        text: words(
          reveal({ opacity: 0, y: 8 }, { delay: beat(-3) }),
          beat(-4),
        ),
      },
      cta: {
        enter: reveal(
          { opacity: 0, y: 8, scale: 0.944 },
          { delay: beat(-2), duration: beat(-2), ease: SPRING },
        ),
      },
    },
    sections: {
      opening: {
        scroll: {
          to: { y: -89, opacity: 0 },
          range: ["5vh", "80vh"],
        },
      },
      feature: {
        leave: {
          to: { opacity: 0, x: -21 },
          duration: beat(-3),
          ease: LEAVE,
        },
      },
      slides: {
        enter: load({ opacity: 0, x: 21 }, { duration: beat(-2) }),
        leave: {
          to: { opacity: 0, x: -21 },
          duration: beat(-3),
          ease: LEAVE,
        },
      },
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
        enter: reveal(
          { opacity: 0, x: 13 },
          { along: "section", delay: beat(-3), duration: beat(-2) },
        ),
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
    "eyebrow",
    "headline",
    "copy",
    "actions",
    "logo",
    "meta",
    "picks",
    "pick",
    "tick",
    "mark",
    "slice",
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
    "feature",
    "pitch",
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
