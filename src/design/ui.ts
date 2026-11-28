import { defineUi } from "@omerdlw/base-framework/recipes";
import { PARTS } from "./recipes";
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
    check: "solar:check-bold",
    selected: "solar:check-bold",
    chevron: "solar:chevrons-up-down-bold",
    previous: "solar:alt-arrow-left-linear",
    next: "solar:alt-arrow-right-linear",
    spinner: "svg-spinners:90-ring-with-bg",
  },
});

declare module "@omerdlw/base-framework/recipes" {
  interface UiRegister {
    ui: typeof ui;
  }
}

export const cn = ui.cn;
