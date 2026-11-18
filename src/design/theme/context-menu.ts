import {
  type ContextMenuMotion,
  contextMenuTheme,
} from "@omerdlw/base-framework/context-menu";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { SHELL } from "@/design/foundations/layers";
import { TONE } from "@/design/foundations/tones";
import { Z_INDEX } from "@/design/foundations/z-index";
import {
  LEAVE,
  SETTLE,
  STAGGER,
  TRAVEL,
  TOUCH,
  at,
  beat,
  spring,
  tween,
} from "./motion";

// The context menu blooms from the point it was opened at: the glass (the
// menu element itself, never an ancestor of it) comes up from a little small
// on a soft spring, its rows rise in one after another, 55ms apart. It goes
// quicker than it came. A row pressed gives a hair and comes back.

const ORIGIN = "top left";

const contextMenuMotion: ContextMenuMotion = {
  pop: {
    hidden: { opacity: 0, transform: at(0, 0.94), transformOrigin: ORIGIN },
    visible: {
      opacity: 1,
      transform: at(),
      transformOrigin: ORIGIN,
      transition: {
        transform: spring(beat(-1)),
        opacity: tween(beat(-3), SETTLE),
      },
    },
    exit: {
      opacity: 0,
      transform: at(0, 0.97),
      transformOrigin: ORIGIN,
      transition: tween(beat(-3), LEAVE),
    },
  },
  content: {
    hidden: { opacity: 0, transform: at(TRAVEL.nudge) },
    visible: {
      opacity: 1,
      transform: at(),
      transition: tween(beat(-1), SETTLE, beat(-5)),
    },
  },
  item: {
    hidden: { opacity: 0, transform: at(TRAVEL.nudge) },
    visible: (index: number) => ({
      opacity: 1,
      transform: at(),
      transition: tween(beat(-1), SETTLE, beat(-5) + index * STAGGER.line),
    }),
  },
  itemTap: { transform: at(0, 0.98) },
  itemTransition: tween(beat(-3), TOUCH),
};

export const contextMenuThemeConfig = defineTheme(contextMenuTheme, {
  slots: {
    backdrop: "fixed inset-0",
    menu: `ui-motion max-w-sm min-w-64 overflow-hidden rounded-sheet ${SHELL}`,
    header: "mb-2 flex items-center gap-3 border-b border-rule pb-2",
    headerIcon:
      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-card ring-1 ring-inset ring-edge bg-fill bg-cover bg-center bg-no-repeat text-ink-body",
    headerText: "h-full w-full min-w-0 space-y-0.5",
    headerEyebrow: `${TONE.label} text-ink-muted`,
    headerTitle: "truncate type-body font-semibold text-ink",
    headerDescription: "type-meta text-ink-body",
    separator: "mx-3 my-1.5 h-px bg-rule",
    item: "group flex h-control-md w-full items-center gap-2.5 rounded-card px-3 text-left type-body font-medium text-ink-body hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink data-[active=true]:bg-fill-hover data-[active=true]:text-ink disabled:pointer-events-none disabled:opacity-50",
    itemIcon:
      "ui-glyph shrink-0 text-ink-muted group-hover:text-ink-body group-focus-visible:text-ink-body group-has-focus-visible:text-ink-body",
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
