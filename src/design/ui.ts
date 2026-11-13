import { defineUi } from "@omerdlw/base-framework/recipes";
import { INSTANT } from "./theme/motion";
import { PARTS } from "./recipes";

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
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: INSTANT },
      exit: { opacity: 0, transition: INSTANT },
    },
    option: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: INSTANT },
    },
    glide: { duration: 0, ease: [0, 0, 1, 1] },
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

export const cn = ui.cn;
