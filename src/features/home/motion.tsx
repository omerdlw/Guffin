"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";
import { Room } from "@/design/components/room";
import { cn } from "@/design/ui";
import type { Curve, Moves } from "@/motion/choreography/choreo";
import {
  DEVELOP,
  DOLLY,
  FOCUS,
  HERO,
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
import { defineStage } from "@/motion/choreography/stage";
import { ambientImage } from "./model";

const STAGGER = { char: 0.021, word: 0.034, item: 0.055, row: 0.089 };

const LINEAR: Curve = [0, 0, 1, 1];

const AT = {
  eyebrow: 0,
  headline: beat(-5),
  meta: beat(-3),
  copy: beat(-2),
  actions: HERO,
  picks: HERO,
};

const REEL_HOLD = beat(4) + beat(1);

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

const soft: Moves = {
  leave: { to: { opacity: 0, blur: 8 }, duration: beat(-2), ease: SETTLE },
};

const HOME = defineStage({
  scope: "home",
  tempo: TEMPO,
  opening: OPENING,
  inset: 0.05,
  scroll: { period: beat(-1), gain: 1 },
  glide: { duration: beat(-1), ease: SWEEP },
  motion: {
    parts: {
      backdrop: {
        scroll: { to: { y: "13%", opacity: 0.236 }, range: ["0px", "100vh"] },
        slots: {
          screen: {
            origin: "center 38%",
            enter: {
              on: "ready",
              from: { opacity: 0, scale: 1.236 },
              duration: beat(0) + beat(-2),
              ease: DOLLY,
            },
            scroll: { to: { scale: 1.055 }, range: ["0px", "100vh"] },
          },
          picture: {
            enter: {
              on: "ready",
              from: { blur: 34, bright: 0.236, saturate: 0 },
              duration: beat(0),
              ease: FOCUS,
            },
          },
        },
      },
      eyebrow: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.eyebrow }),
      },
      headline: {
        enter: load({ opacity: 0, blur: 12 }, { delay: AT.headline }),
      },
      copy: {
        enter: load({ opacity: 0, blur: 10 }, { delay: AT.copy }),
      },
      actions: {
        enter: load(
          { opacity: 0, blur: 8 },
          { delay: AT.actions, duration: beat(-2) },
        ),
      },
      logo: {
        enter: load({ opacity: 0, blur: 12 }, { delay: AT.headline }),
      },
      meta: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.meta }),
      },
      picks: {
        enter: load({ opacity: 0, blur: 8 }, { delay: AT.picks }),
      },
      pick: {
        ...lift,
        enter: load(
          { opacity: 0, blur: 8 },
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
      tick: {
        origin: "left center",
        enter: load(
          { scale: [0, 1] },
          { duration: REEL_HOLD / TEMPO, ease: LINEAR },
        ),
      },
      mark: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      slice: {
        enter: reveal({ opacity: 0, blur: 12 }, {}),
        slots: {
          image: {
            hover: { scale: 1.055, duration: beat(-1), ease: SETTLE },
            rest: { duration: beat(-1), ease: SETTLE },
          },
        },
      },
      header: {
        enter: reveal({ opacity: 0, blur: 10 }, { duration: beat(-2) }),
        slots: {
          rule: {
            enter: reveal({ opacity: 0, blur: 6 }, { delay: beat(-6) }),
          },
        },
      },
      live: {
        enter: reveal(
          { opacity: 0, blur: 8 },
          { delay: beat(-6), duration: beat(-2) },
        ),
      },
      slide: {
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      poster: {
        enter: reveal({ opacity: 0, blur: 12 }),
      },
      card: {
        ...lift,
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      rank: {
        ...nudge,
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      cover: {
        enter: reveal({ opacity: 0, blur: 12 }, { ease: DEVELOP }),
        slots: {
          image: {
            hover: { scale: 1.055, duration: beat(-1), ease: SETTLE },
            rest: { duration: beat(-1), ease: SETTLE },
          },
        },
      },
      lead: {
        enter: reveal({ opacity: 0, blur: 10 }),
      },
      byline: {
        enter: reveal({ opacity: 0, blur: 8 }),
      },
      review: {
        ...lift,
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      list: {
        hover: { opacity: 0.8, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
        press,
        enter: reveal({ opacity: 0, blur: 12 }, {}),
      },
      member: {
        ...lift,
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
      verb: {
        enter: reveal({ opacity: 0, blur: 8 }, {}),
      },
      rule: {
        enter: reveal({ opacity: 0, blur: 6 }),
      },
      tag: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-3) }),
      },
      finale: {
        enter: reveal({ opacity: 0, blur: 12 }),
      },
      pitch: {
        enter: reveal({ opacity: 0, blur: 10 }),
      },
      cta: {
        enter: reveal({ opacity: 0, blur: 8 }, { duration: beat(-2) }),
      },
    },
    sections: {
      opening: {
        scroll: {
          to: { y: -89, opacity: 0 },
          range: ["5vh", "80vh"],
        },
      },
      feature: soft,
      slides: {
        ...soft,
        enter: reveal({ opacity: 0, blur: 12 }),
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
          { opacity: 0, blur: 8 },
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
