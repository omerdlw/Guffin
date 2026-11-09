import { type VariantProps, variants } from "../../foundations/variants";

/*
 * A segmented control: a strip of tabs on a quiet track, the chosen one
 * marked by a grade pill that slides to it.
 *
 *   size   sm 32 · md 40
 *   shape  pill · card
 *   width  auto (as wide as its tabs) · fill (tabs share the row)
 */

export const segmentedControlVariants = variants(
  "relative max-w-full items-stretch gap-0.5 overflow-x-auto bg-fill p-0.5 ring-1 ring-edge ring-inset select-none scrollbar-none",
  {
    variants: {
      size: { sm: "h-control-sm", md: "h-control-md" },
      shape: { pill: "rounded-full", card: "rounded-card" },
      width: { auto: "inline-flex w-fit", fill: "flex w-full" },
    },
    defaultVariants: { shape: "pill", size: "sm", width: "auto" },
  },
);

export const segmentVariants = variants(
  "cine-fade relative inline-flex min-w-fit cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-edge-focus focus-visible:ring-inset",
  {
    variants: {
      active: {
        true: "text-ink",
        false: "text-ink-body hover:text-ink focus-visible:text-ink",
      },
      size: { sm: "px-3.5 type-meta", md: "px-4 type-control" },
      shape: { pill: "rounded-full", card: "rounded-tile" },
      width: { auto: "", fill: "flex-1" },
    },
    defaultVariants: {
      active: false,
      shape: "pill",
      size: "sm",
      width: "auto",
    },
  },
);

export const segmentPillVariants = variants("inset-y-0.5 bg-grade/15", {
  variants: {
    shape: { pill: "rounded-full", card: "rounded-tile" },
  },
  defaultVariants: { shape: "pill" },
});

export type SegmentedControlVariants = VariantProps<
  typeof segmentedControlVariants
>;
