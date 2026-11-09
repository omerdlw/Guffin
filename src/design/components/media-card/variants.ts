import { type VariantProps, variants } from "../../foundations/variants";

const ASPECT = {
  free: "",
  poster: "aspect-[2/3]",
  square: "aspect-square",
  video: "aspect-video",
} as const;

/** The card: a column of the frame and its caption. */
export const mediaCardVariants = variants(
  "cine-card group/media flex min-w-0 flex-col gap-1.5 outline-none",
  {
    variants: {
      aspect: { free: "", poster: "w-full", square: "w-full", video: "w-full" },
    },
    defaultVariants: { aspect: "poster" },
  },
);

/** The frame the picture sits in. */
export const mediaFrameVariants = variants(
  "cine-fade relative isolate overflow-hidden",
  {
    variants: {
      aspect: ASPECT,
      framed: { false: "", true: "bg-fill" },
    },
    defaultVariants: { aspect: "poster", framed: true },
  },
);

export type MediaCardVariants = VariantProps<typeof mediaCardVariants>;
