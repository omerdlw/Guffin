import {
  type NotificationMotion,
  notificationTheme,
} from "@omerdlw/base-framework/notification";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { FLOAT } from "@/design/foundations/layers";
import { Z_INDEX } from "@/design/foundations/z-index";
import { motion, tween } from "@/motion/time";

const { durations: notificationTime, easings: notificationEase } = motion;

const enter = tween(notificationTime.light, notificationEase.fade);

const notificationMotion: NotificationMotion = {
  transition: enter,
  toast: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: enter },
    exit: {
      opacity: 0,
      transition: tween(notificationTime.leave, notificationEase.fade),
    },
  },
};

export const notificationThemeConfig = defineTheme(notificationTheme, {
  slots: {
    layer:
      "ui-motion pointer-events-none fixed inset-x-0 bottom-2 mx-auto flex w-full max-w-[380px] flex-col items-center justify-center px-4",
    toast: `pointer-events-auto flex h-control-md w-full cursor-pointer items-center justify-center rounded-full px-5 type-meta font-medium text-ink select-none hover:ring-edge-focus focus-visible:ring-edge-focus ${FLOAT}`,
    toastDocked: "absolute inset-x-0 top-[calc(100%+6px)] z-20",
    toastMessage: "truncate text-center type-meta font-medium text-ink",
  },
  styles: {
    layer: { zIndex: Z_INDEX.NOTIFICATION },
  },
  motion: notificationMotion,
});
