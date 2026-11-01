import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { defineTheme } from "@omerdlw/base-framework/theme";
import { contextMenuTheme } from "@omerdlw/base-framework/modules/context-menu";
import { SHELL } from "./chrome";
import { contextMenuMotion } from "./motion/context-menu";

export const contextMenuThemeConfig = defineTheme(contextMenuTheme, {
  slots: {
    backdrop: "fixed inset-0",
    menu: `ui-motion max-w-sm min-w-64 overflow-hidden rounded-sheet backdrop-blur-xl ${SHELL}`,
    header: "mb-2 flex items-center gap-3 border-b border-rule pb-2",
    headerIcon:
      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-card ring-1 ring-inset ring-edge bg-fill bg-cover bg-center bg-no-repeat text-ink-body",
    headerText: "h-full w-full min-w-0 space-y-0.5",
    headerEyebrow:
      "text-[11px] leading-4 font-semibold tracking-[0.14em] text-ink-muted uppercase",
    headerTitle: "truncate text-sm leading-tight font-semibold text-ink",
    headerDescription: "text-xs leading-snug text-ink-body",
    separator: "mx-3 my-1.5 h-px bg-rule",
    item: "group flex h-10 w-full items-center gap-2.5 rounded-card px-3 text-left text-sm font-medium text-ink-body hover:bg-fill-hover hover:text-ink data-[active=true]:bg-fill-hover data-[active=true]:text-ink disabled:pointer-events-none disabled:opacity-50",
    itemIcon: "ui-glyph shrink-0 text-ink-muted group-hover:text-ink-body",
    itemLabel: "grow truncate",
    itemShortcut:
      "ml-2 shrink-0 rounded-full bg-fill px-2 py-0.5 text-[11px] text-ink-muted uppercase ring-1 ring-edge ring-inset",
  },
  styles: {
    backdrop: { zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP },
    menu: { padding: 8, zIndex: Z_INDEX.CONTEXT_MENU },
  },
  motion: contextMenuMotion,
});
