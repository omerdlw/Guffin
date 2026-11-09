import { type VariantProps, variants } from "../../foundations/variants";

const DISABLED = "disabled:cursor-not-allowed disabled:opacity-50";

/** The track: a fill at rest, the primary colour when on. */
export const switchVariants = variants(
  [
    "group/switch ui-still relative inline-flex shrink-0 cursor-pointer items-center rounded-full bg-fill-hover p-0.5 ring-1 ring-edge ring-inset",
    "transition-[background-color,box-shadow,outline-color,outline-offset] duration-reveal ease-out-cream",
    "hover:bg-fill-active hover:ring-edge-hover focus-visible:bg-fill-active focus-visible:ring-edge-focus",
    "data-[state=checked]:bg-primary data-[state=checked]:ring-primary data-[state=checked]:hover:bg-primary-hover data-[state=checked]:focus-visible:bg-primary-hover",
    DISABLED,
  ],
  {
    variants: {
      size: { sm: "h-5 w-8", md: "h-6 w-10" },
    },
    defaultVariants: { size: "md" },
  },
);

/** The thumb: it stretches while pressed, as if pulled, then lands. */
export const switchThumbVariants = variants(
  [
    "pointer-events-none block translate-x-0 rounded-full bg-ink-body transition-[translate,width,background-color] duration-reveal ease-out-cream",
    "group-hover/switch:bg-ink-lead group-focus-visible/switch:bg-ink-lead group-has-focus-visible/switch:bg-ink-lead",
    "data-[state=checked]:bg-on-primary",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-4 group-active/switch:w-5 data-[state=checked]:translate-x-3 group-active/switch:data-[state=checked]:translate-x-2",
        md: "h-5 w-5 group-active/switch:w-6 data-[state=checked]:translate-x-4 group-active/switch:data-[state=checked]:translate-x-3",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type SwitchVariants = VariantProps<typeof switchVariants>;
