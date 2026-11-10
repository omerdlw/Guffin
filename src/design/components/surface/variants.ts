import { type VariantProps, variants } from "../../foundations/variants";

const TILE = "flex min-w-0 items-center gap-3 rounded-card p-1.5";

/**
 * A row inside a surface that is pressed as a whole (a list, a status). Rows
 * carry no ring at rest and no hover fill of their own: a list shares one
 * through `HighlightGroup`. A chosen row takes the grade.
 */
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

/** A static tile inside a surface: a picture or glyph beside two lines of text. */
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
