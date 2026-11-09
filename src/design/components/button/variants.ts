import { STATE, TONES } from "../../foundations/tones";
import { type VariantProps, variants } from "../../foundations/variants";

/**
 * The control recipe: every button, and anything drawn as one (a link, a
 * framework slot). Geometry comes from the control ladder, colour and state
 * from the tones.
 *
 *   intent  neutral · chosen · primary · danger · armed · glass · ghost
 *   size    xs 24 · sm 32 · chrome 36 · md 40 · lg 48
 *   shape   card · pill · thumb
 *   icon    a square control holding only a glyph
 *   width   auto · full · fill (shares a row with its siblings)
 */
export const buttonVariants = variants(
  [
    "center relative inline-flex cursor-pointer items-center justify-center font-medium select-none outline-none",
    STATE.disabled,
    STATE.busy,
  ],
  {
    variants: {
      intent: TONES,
      size: {
        xs: "h-control-xs gap-1 px-2.5 type-label",
        sm: "h-control-sm gap-1.5 px-3.5 type-meta",
        chrome: "h-control-chrome gap-2 px-4 type-control",
        md: "h-control-md gap-2 px-4 type-control",
        lg: "h-control-lg gap-2.5 px-5 type-body",
      },
      shape: {
        card: "rounded-card",
        pill: "rounded-full",
        thumb: "rounded-thumb",
      },
      icon: { false: "", true: "shrink-0 px-0" },
      width: { auto: "", full: "w-full", fill: "min-w-0 flex-1" },
    },
    compoundVariants: [
      { icon: true, size: "xs", class: "size-control-xs" },
      { icon: true, size: "sm", class: "size-control-sm" },
      { icon: true, size: "chrome", class: "size-control-chrome" },
      { icon: true, size: "md", class: "size-control-md" },
      { icon: true, size: "lg", class: "size-control-lg" },
    ],
    defaultVariants: {
      icon: false,
      intent: "neutral",
      shape: "card",
      size: "md",
      width: "auto",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
