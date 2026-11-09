import { variants } from "../../foundations/variants";

/** An arrow at one end of the rack; it shrinks away when there is nowhere to go. */
export const carouselArrowVariants = variants(
  "center absolute top-1/2 z-10 size-control-chrome -translate-y-1/2 cursor-pointer transition-[opacity,scale,background-color] ease-out-expo sm:size-control-md",
  {
    variants: {
      side: { left: "left-2 sm:left-3", right: "right-2 sm:right-3" },
      visible: {
        true: "scale-100 opacity-100",
        false: "pointer-events-none scale-75 opacity-0",
      },
    },
  },
);
