import { type VariantProps, variants } from "../../foundations/variants";

/*
 * An image is two parts: the frame, which holds the space and shows the
 * skeleton while loading, and the picture, which fades in once it has
 * decoded. Position, size, radius and dimming go on the frame
 * (`wrapperClassName`), so they never fight the picture's own fade.
 *
 *   layout  fill (the frame fills its box; the picture covers it)
 *           intrinsic (the frame wraps the picture's own size)
 *   fit     cover · contain
 */

export const imageFrameVariants = variants(
  "relative overflow-hidden select-none",
  {
    variants: {
      layout: {
        fill: "h-full w-full bg-fill",
        intrinsic: "inline-flex max-w-full",
      },
    },
    defaultVariants: { layout: "fill" },
  },
);

export const imageVariants = variants(
  "opacity-0 data-[state=loaded]:opacity-100",
  {
    variants: {
      layout: {
        fill: "h-full w-full data-[fill]:absolute data-[fill]:inset-0 data-[fill]:select-none",
        intrinsic: "block max-w-full",
      },
      fit: { cover: "object-cover", contain: "object-contain" },
    },
    defaultVariants: { fit: "cover", layout: "fill" },
  },
);

export type ImageVariants = VariantProps<typeof imageVariants>;
