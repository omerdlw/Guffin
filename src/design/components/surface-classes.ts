import { WELL, WELL_HOVER } from "@/design/foundations/tones";
import { variants } from "@/design/foundations/variants";

export const SURFACE_STACK = "flex w-full flex-col gap-2.5";
export const SURFACE_TILE_INNER = "rounded-inset";
export const SURFACE_TILE_END = "pr-5";
export const SURFACE_POSTER = "h-[60px] w-10 shrink-0 overflow-hidden";
export const SURFACE_TEXT =
  "flex min-w-0 flex-1 flex-col justify-center text-left";
export const SURFACE_TITLE = "truncate type-body font-semibold text-ink";
export const SURFACE_META = "truncate type-meta text-ink-muted";
export const SURFACE_PANEL = `rounded-card ${WELL}`;
export const SURFACE_SCROLL =
  "overflow-y-auto overscroll-contain rounded-card [clip-path:inset(0_round_var(--radius-card))] scrollbar-none";

const TILE = "flex min-w-0 items-center gap-3 rounded-card p-1.5";

export const SURFACE_GROUP = `flex w-full flex-col rounded-card p-1 ${WELL}`;
export const GROUP_HIGHLIGHT = "rounded-tile";

export const groupRowVariants = variants(
  "group relative isolate flex w-full min-w-0 items-center gap-3 rounded-tile p-2 text-left select-none outline-none",
  {
    variants: {
      action: {
        false: "",
        true: "cursor-pointer text-ink-body hover:text-ink focus-visible:text-ink disabled:cursor-wait",
      },
    },
    defaultVariants: { action: false },
  },
);

export const CHOICE_BODY =
  "flex w-full flex-col items-start justify-between gap-4 self-stretch";

export const choiceVariants = variants(
  "group relative isolate h-auto min-h-24 w-full cursor-pointer rounded-card p-4 text-left select-none outline-none disabled:cursor-wait",
  {
    variants: {
      chosen: {
        false: `${WELL} ${WELL_HOVER} text-ink-body hover:text-ink focus-visible:text-ink`,
        true: "ui-sheen bg-grade text-on-accent",
      },
    },
    defaultVariants: { chosen: false },
  },
);

export const rowVariants = variants(
  [
    "group relative isolate w-full cursor-pointer pr-5 select-none outline-none disabled:cursor-wait",
    TILE,
  ],
  {
    variants: {
      intent: {
        neutral: `${WELL} text-ink-body hover:text-ink focus-visible:text-ink`,
        chosen:
          "bg-grade/15 text-grade ring-1 ring-grade/25 ring-inset hover:ring-grade/30 focus-visible:ring-grade/30",
      },
    },
    defaultVariants: { intent: "neutral" },
  },
);

export const tileVariants = variants([TILE, WELL], {
  variants: {
    interactive: {
      false: "",
      true: WELL_HOVER,
    },
  },
  defaultVariants: { interactive: false },
});
