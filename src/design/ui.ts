import { defineUi } from "@omerdlw/base-framework/recipes";
import { POINTS } from "@/motion/constants";
import { SPRING } from "@/motion/time";
import { step } from "@/motion/utils";
import { PARTS } from "./recipes";

const STAGGER_LIMIT = 5;

export const ui = defineUi({
  parts: PARTS,
  merge: {
    theme: {
      ease: [
        "out-expo",
        "out-quart",
        "out-quint",
        "in-out-cubic",
        "in-cubic",
        "out-cream",
        "phosphor",
        "fade",
      ],
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
      duration: [
        "flick",
        "touch",
        "leave",
        "light",
        "reveal",
        "move",
        "settle",
        "linger",
        "ripple",
      ].map((name) => `duration-${name}`),
    },
  },
  motion: {
    follow: SPRING.follow,
    menu: {
      initial: (rise: number) => ({ opacity: 0, scale: 0.96, y: rise * -8 }),
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: step(0), ease: POINTS.expo },
      },
      exit: (rise: number) => ({
        opacity: 0,
        scale: 0.97,
        y: rise * -6,
        transition: { duration: step(-2), ease: POINTS.glide },
      }),
    },
    option: {
      initial: { opacity: 0, x: -8 },
      animate: (index: number) => ({
        opacity: 1,
        x: 0,
        transition: {
          duration: step(-1),
          ease: POINTS.expo,
          delay: step(-5) * (1 + Math.min(index, STAGGER_LIMIT)),
        },
      }),
    },
    glide: { duration: step(2), ease: POINTS.dolly },
  },
  icons: {
    check: "material-symbols:check-rounded",
    selected: "solar:check-read-linear",
    chevron: "solar:alt-arrow-down-linear",
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
