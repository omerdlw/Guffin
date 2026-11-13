import { type VariantProps, variants } from "@/design/foundations/variants";

export const SURFACE_STACK = "flex w-full flex-col gap-2.5";
export const SURFACE_TILE_INNER = "rounded-inset";
export const SURFACE_TILE_END = "pr-5";
export const SURFACE_POSTER = "h-[60px] w-10 shrink-0 overflow-hidden";
export const SURFACE_TEXT =
  "flex min-w-0 flex-1 flex-col justify-center text-left";
export const SURFACE_TITLE = "truncate type-body font-semibold text-ink";
export const SURFACE_META = "truncate type-meta text-ink-muted";
export const SURFACE_PANEL = "rounded-card bg-fill";
export const SURFACE_SCROLL =
  "overflow-y-auto overscroll-contain rounded-card [clip-path:inset(0_round_var(--radius-card))] scrollbar-none";

const TILE = "flex min-w-0 items-center gap-3 rounded-card p-1.5";

export const rowVariants = variants(
  [
    "group relative isolate w-full cursor-pointer pr-5 select-none outline-none disabled:cursor-wait",
    TILE,
  ],
  {
    variants: {
      intent: {
        neutral: "bg-fill text-ink-body hover:text-ink focus-visible:text-ink",
        chosen:
          "bg-grade/15 text-grade ring-1 ring-grade/25 ring-inset hover:ring-grade/30 focus-visible:ring-grade/30",
      },
    },
    defaultVariants: { intent: "neutral" },
  },
);

export const tileVariants = variants([TILE, "bg-fill"], {
  variants: {
    interactive: {
      false: "",
      true: "hover:bg-fill-hover focus-visible:bg-fill-hover",
    },
  },
  defaultVariants: { interactive: false },
});

export type RowVariants = VariantProps<typeof rowVariants>;
