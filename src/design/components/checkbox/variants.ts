import { type VariantProps, variants } from "../../foundations/variants";

/**
 * The check: a ring at rest that fills with the grade when checked. It answers
 * the hover of the `group` it sits in (a row, or the Checkbox itself), so a
 * whole row can be the target.
 *
 *   size    sm 20 · md 24
 *   reveal  hint the check inside an empty ring while the group is pointed at
 */
export const checkboxVariants = variants(
  "center relative z-10 shrink-0 rounded-full ring-1 ring-inset",
  {
    variants: {
      checked: {
        true: "bg-grade text-on-accent ring-grade",
        false:
          "text-transparent ring-edge-hover group-hover:ring-edge-focus group-focus-visible:ring-edge-focus group-has-focus-visible:ring-edge-focus",
      },
      reveal: { false: "", true: "" },
      size: { sm: "size-5", md: "size-6" },
    },
    compoundVariants: [
      {
        checked: false,
        reveal: true,
        class:
          "group-hover:text-ink-faint group-focus-visible:text-ink-faint group-has-focus-visible:text-ink-faint",
      },
    ],
    defaultVariants: { checked: false, reveal: false, size: "md" },
  },
);

export const checkGlyphVariants = variants("ui-glyph center", {
  variants: {
    reveal: { false: "", true: "" },
    checked: { false: "", true: "" },
  },
  compoundVariants: [
    { reveal: true, checked: true, class: "scale-100" },
    { reveal: true, checked: false, class: "scale-75 group-hover:scale-90" },
  ],
});

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
