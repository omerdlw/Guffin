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
