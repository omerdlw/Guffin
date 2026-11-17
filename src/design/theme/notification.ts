import {
  type NotificationMotion,
  notificationTheme,
} from "@omerdlw/base-framework/notification";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { SHELL } from "@/design/foundations/layers";
import { Z_INDEX } from "@/design/foundations/z-index";
import {
  LEAVE,
  SETTLE,
  TRAVEL,
  away,
  beat,
  here,
  spring,
  tween,
} from "./motion";

// A toast rises 13px out from under the dock and settles on a critically
// damped spring while its glass (the toast itself) comes up; it leaves by
// lifting a little and going. One toast at a time: the next waits for it.

const notificationMotion: NotificationMotion = {
  transition: {
    transform: spring(beat(-1)),
    opacity: tween(beat(-3), SETTLE),
  },
  toast: {
    hidden: away(TRAVEL.rise),
    visible: here(),
    exit: {
      ...away(-TRAVEL.nudge),
      transition: tween(beat(-3), LEAVE),
    },
  },
};

export const notificationThemeConfig = defineTheme(notificationTheme, {
  slots: {
    layer:
      "ui-motion pointer-events-none fixed inset-x-0 bottom-2 mx-auto flex w-full max-w-[380px] flex-col items-center justify-center px-4",
    toast: `pointer-events-auto flex h-control-md w-full cursor-pointer items-center justify-center rounded-full px-5 type-meta font-medium text-ink select-none ${SHELL}`,
    toastDocked: "absolute inset-x-0 top-[calc(100%+6px)] z-20",
    toastMessage: "truncate text-center type-meta font-medium text-ink",
  },
  styles: {
    layer: { zIndex: Z_INDEX.NOTIFICATION },
  },
  motion: notificationMotion,
});
