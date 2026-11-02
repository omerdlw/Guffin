import { errorTheme } from "@omerdlw/base-framework/error";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { PRIMARY } from "./chrome";

export const errorThemeConfig = defineTheme(errorTheme, {
  slots: {
    screen:
      "ui-motion w-screen h-screen flex flex-col gap-2.5 center bg-danger/10",
    icon: "bg-fill text-ink flex size-12 items-center justify-center rounded-full ring-1 ring-inset ring-edge-hover type-heading font-bold",
    title: "type-title font-semibold",
    retryButton: `${PRIMARY} h-10 cursor-pointer px-5 type-control font-medium rounded-full`,
  },
});
