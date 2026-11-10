import { SHELL } from "../../foundations/layers";
import { type VariantProps, variants } from "../../foundations/variants";

/*
 * A select is three parts that share `size` and `shape`, so a trigger, its
 * menu and the menu's options always agree:
 *
 *   size   sm 32 · md 40
 *   shape  card (menu rounded-card, options inset) · pill (menu rounded-panel,
 *          options and trigger round)
 */

export const selectTriggerVariants = variants(
  [
    "cine-fade group flex w-full items-center justify-between gap-2 bg-fill text-left text-ink ring-1 ring-edge ring-inset",
    "hover:bg-fill-hover hover:ring-edge-hover focus-visible:bg-fill-hover focus-visible:ring-edge-focus aria-expanded:bg-fill-hover aria-expanded:ring-edge-focus",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "h-control-sm px-3 type-meta",
        md: "h-control-md px-3.5 type-body",
      },
      shape: { card: "rounded-card", pill: "rounded-full" },
    },
    defaultVariants: { shape: "card", size: "md" },
  },
);

export const selectMenuVariants = variants(
  [
    "ui-motion absolute top-full left-0 mt-1.5 max-h-64 w-full overflow-y-auto overscroll-contain",
    SHELL,
  ],
  {
    variants: {
      size: { sm: "p-1", md: "p-1.5" },
      shape: { card: "rounded-card", pill: "rounded-panel" },
    },
    defaultVariants: { shape: "card", size: "md" },
  },
);

export const selectOptionVariants = variants(
  [
    "relative isolate flex cursor-pointer items-center justify-between gap-2.5 text-ink-body select-none",
    "data-[highlighted]:text-ink aria-selected:font-medium aria-selected:text-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "px-2.5 py-1.5 type-meta",
        md: "px-3 py-2 type-body",
      },
      shape: { card: "rounded-inset", pill: "rounded-full" },
    },
    defaultVariants: { shape: "card", size: "md" },
  },
);

export type SelectVariants = VariantProps<typeof selectTriggerVariants>;
