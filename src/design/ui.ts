import { defineUi } from "@omerdlw/base-framework/ui/recipes";
import { SPRING } from "@/motion/time";

export const ui = defineUi({
  parts: {
    segmented: { segment: { base: "cine-fade" } },
    select: {
      trigger: { base: "cine-fade" },
      chevron: { base: "cine-turn" },
    },
  },
  merge: {
    theme: {
      leading: ["crop"],
      spacing: ["fib-1", "fib-2", "fib-3", "fib-4", "fib-5", "fib-6", "fib-7"],
      tracking: ["label", "tagline", "slate"],
    },
    classGroups: { duration: ["ripple"] },
  },
  motion: { follow: SPRING.follow },
});

declare module "@omerdlw/base-framework/ui/recipes" {
  interface UiRegister {
    ui: typeof ui;
  }
}
