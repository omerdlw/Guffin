import { errorTheme } from "@omerdlw/base-framework/error";
import { defineTheme } from "@omerdlw/base-framework/theme";

export const errorThemeConfig = defineTheme(errorTheme, {
  slots: {
    screen:
      "ui-motion w-screen h-screen flex flex-col gap-2.5 center bg-danger/10",
    icon: "bg-fill text-ink flex size-12 items-center justify-center rounded-full ring-1 ring-inset ring-edge-hover type-heading font-bold",
    title: "type-title font-semibold",
    retryButton:
      "ui-sheen h-10 bg-danger/15 cursor-pointer hover:bg-white hover:text-black px-5 type-control font-medium text-ink rounded-full [--sheen-ink:0_0_0]",
  },
});
