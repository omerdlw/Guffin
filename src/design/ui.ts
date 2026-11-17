import { defineUi } from "@omerdlw/base-framework/recipes";
import {
  INSTANT,
  LEAVE,
  SETTLE,
  STAGGER,
  TRAVEL,
  at,
  beat,
  spring,
  tween,
} from "./theme/motion";
import { PARTS } from "./recipes";

/**
 * A select menu's clip: a capsule at the trigger's edge (the side it opens
 * from), and open, well past every edge so the layer's shadow is whole. Every
 * stop names the same units, so the clip interpolates.
 */
const MENU_CLIP = {
  above: "inset(80% 12% 0% 12% round 24px)",
  below: "inset(0% 12% 80% 12% round 24px)",
  open: "inset(-25% -15% -25% -15% round 48px)",
} as const;

export const ui = defineUi({
  parts: PARTS,
  merge: {
    theme: {
      leading: ["crop"],
      radius: [
        "mark",
        "thumb",
        "inset",
        "tile",
        "card",
        "panel",
        "sheet",
        "shell",
      ],
      spacing: [
        "control-xs",
        "control-sm",
        "control-chrome",
        "control-md",
        "control-lg",
        "fib-1",
        "fib-2",
        "fib-3",
        "fib-4",
        "fib-5",
        "fib-6",
        "fib-7",
      ],
      tracking: ["label", "tagline", "slate"],
    },
    classGroups: {
      "font-size": [
        "micro",
        "label",
        "meta",
        "control",
        "body",
        "copy",
        "base",
        "prose",
        "prose-wide",
        "title",
        "heading",
        "display-xs",
        "display-sm",
        "display-md",
        "display-lg",
        "display-xl",
        "display-2xl",
      ].map((name) => `type-${name}`),
    },
  },
  // A select's menu grows out of its trigger like iOS 26's (custom: 1 below
  // it, -1 above): a capsule at the trigger's edge opens to the whole glass
  // with a little give, and its options settle in behind it, 34ms apart.
  // The glass is clipped, never scaled hard: its lens stays laid out for its
  // box. The clip runs well past the edge at rest, so the shadow stays whole. `follow` stays instant: it drives every HighlightGroup and
  // SlidingPill, which the pages glide through their own `follow` (06-motion).
  motion: {
    follow: INSTANT,
    menu: {
      initial: (rise: number) => ({
        clipPath: rise < 0 ? MENU_CLIP.above : MENU_CLIP.below,
        opacity: 0,
        transform: at(-rise * TRAVEL.hair, 0.98),
      }),
      animate: {
        clipPath: MENU_CLIP.open,
        opacity: 1,
        transform: at(),
        transition: {
          clipPath: spring(beat(-3), 0.2),
          transform: spring(beat(-3), 0.2),
          opacity: tween(beat(-5), SETTLE),
        },
      },
      exit: (rise: number) => ({
        clipPath: rise < 0 ? MENU_CLIP.above : MENU_CLIP.below,
        opacity: 0,
        transform: at(-rise * TRAVEL.hair, 0.98),
        transition: tween(beat(-4), LEAVE),
      }),
    },
    option: {
      initial: { opacity: 0 },
      animate: (index: number) => ({
        opacity: 1,
        transition: tween(beat(-3), SETTLE, Math.min(index, 8) * STAGGER.item),
      }),
    },
    glide: { duration: 0, ease: [0, 0, 1, 1] },
  },
  icons: {
    check: "material-symbols:check-rounded",
    selected: "material-symbols:check-rounded",
    chevron: "solar:chevrons-up-down-linear",
    previous: "solar:alt-arrow-left-bold",
    next: "solar:alt-arrow-right-bold",
    spinner: "mingcute:loading-3-fill",
  },
});

declare module "@omerdlw/base-framework/recipes" {
  interface UiRegister {
    ui: typeof ui;
  }
}

export const cn = ui.cn;
