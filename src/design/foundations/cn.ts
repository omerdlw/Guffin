import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          type: [
            "micro",
            "label",
            "meta",
            "control",
            "body",
            "copy",
            "base",
            "prose",
            "title",
            "heading",
            "display-xs",
            "display-sm",
            "display-md",
            "display-lg",
            "display-xl",
            "display-2xl",
          ],
        },
      ],
      duration: [
        {
          duration: [
            "ripple",
            "flick",
            "touch",
            "leave",
            "light",
            "reveal",
            "move",
            "settle",
            "linger",
          ],
        },
      ],
    },
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
      radius: [
        "thumb",
        "tile",
        "card",
        "panel",
        "sheet",
        "inset",
        "shell",
        "mark",
      ],
      tracking: ["label", "tagline", "slate"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
