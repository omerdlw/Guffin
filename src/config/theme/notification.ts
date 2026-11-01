import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { notificationTheme } from "@omerdlw/base-framework/modules/notification";
import { FLOAT } from "./chrome";
import { notificationMotion } from "./motion/notification";

export const notificationThemeConfig = defineTheme(notificationTheme, {
  slots: {
    layer:
      "ui-motion pointer-events-none fixed inset-x-0 bottom-2 mx-auto flex w-full max-w-[380px] flex-col items-center justify-center px-4",
    toast: `pointer-events-auto flex h-10 w-full cursor-pointer items-center justify-center rounded-full px-5 text-xs font-medium text-ink select-none hover:ring-edge-focus ${FLOAT}`,
    toastDocked: "absolute inset-x-0 top-[calc(100%+6px)] z-20",
    toastMessage: "truncate text-center text-xs font-medium text-ink",
  },
  styles: {
    layer: { zIndex: Z_INDEX.NOTIFICATION },
  },
  motion: notificationMotion,
});
