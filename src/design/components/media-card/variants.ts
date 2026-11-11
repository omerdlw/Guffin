import { type VariantProps, variants } from "../../foundations/variants";

const ASPECT = {
  free: "",
  poster: "aspect-[2/3]",
  square: "aspect-square",
  video: "aspect-video",
} as const;

export const mediaCardVariants = variants(
  "cine-card group/media flex min-w-0 flex-col gap-1.5 outline-none",
  {
    variants: {
      aspect: { free: "", poster: "w-full", square: "w-full", video: "w-full" },
    },
    defaultVariants: { aspect: "poster" },
  },
);

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
