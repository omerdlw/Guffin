import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { contextMenuTheme } from "@omerdlw/base-framework/modules/context-menu";
import { TONE } from "@/ui/page";
import { SHELL } from "./chrome";
import type { ContextMenuMotion } from "@omerdlw/base-framework/modules/context-menu";
import { motion, tween } from "./motion";

const { durations: time, easings: ease, springs } = motion;

const leave = tween(time.leave, ease.fade);
const ORIGIN = "top left";

const rowDelay = (index: unknown) =>
  time.step + Math.min(Math.max(Number(index) || 0, 0), 5) * time.step;

export const contextMenuMotion: ContextMenuMotion = {
  pop: {
    hidden: {
      opacity: 0,
      transform: "translate3d(0px, 0px, 0) scale(0.98)",
      transformOrigin: ORIGIN,
    },
    visible: {
      opacity: 1,
      transform: "translate3d(0px, 0px, 0) scale(1)",
      transformOrigin: ORIGIN,
      transition: {
        transform: tween(time.reveal, ease.pour),
        opacity: tween(time.light, ease.fade),
      },
    },
    exit: {
      opacity: 0,
      transform: "translate3d(0px, 0px, 0) scale(1)",
      transformOrigin: ORIGIN,
      transition: leave,
    },
  },
  content: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: tween(time.light, ease.fade) },
  },
  item: {
    hidden: { opacity: 0 },
    visible: (index: unknown = 0) => ({
      opacity: 1,
      transition: tween(time.light, ease.fade, rowDelay(index)),
    }),
  },
  itemTap: { transform: "translate3d(0px, 0px, 0) scale(1)" },
  itemTransition: springs.press,
};

export const contextMenuThemeConfig = defineTheme(contextMenuTheme, {
  slots: {
    backdrop: "fixed inset-0",
    menu: `ui-motion max-w-sm min-w-64 overflow-hidden rounded-sheet backdrop-blur-xl ${SHELL}`,
    header: "mb-2 flex items-center gap-3 border-b border-rule pb-2",
    headerIcon:
      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-card ring-1 ring-inset ring-edge bg-fill bg-cover bg-center bg-no-repeat text-ink-body",
    headerText: "h-full w-full min-w-0 space-y-0.5",
    headerEyebrow: `${TONE.label} text-ink-muted`,
    headerTitle: "truncate type-body font-semibold text-ink",
    headerDescription: "type-meta text-ink-body",
    separator: "mx-3 my-1.5 h-px bg-rule",
    item: "group flex h-10 w-full items-center gap-2.5 rounded-card px-3 text-left type-body font-medium text-ink-body hover:bg-fill-hover hover:text-ink data-[active=true]:bg-fill-hover data-[active=true]:text-ink disabled:pointer-events-none disabled:opacity-50",
    itemIcon: "ui-glyph shrink-0 text-ink-muted group-hover:text-ink-body",
    itemLabel: "grow truncate",
    itemShortcut:
      "ml-2 shrink-0 rounded-full bg-fill px-2 py-0.5 type-label text-ink-muted uppercase ring-1 ring-edge ring-inset",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP },
    menu: { padding: 8, zIndex: Z_INDEX.CONTEXT_MENU },
  },
  motion: contextMenuMotion,
});
