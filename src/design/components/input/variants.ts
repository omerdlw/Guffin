import { type VariantProps, variants } from "../../foundations/variants";

/**
 * A text field: a quiet fill with a ring that steps up on hover and focus.
 * Fields answer `focus:` rather than `focus-visible:`, because a pointer that
 * lands in a field is about to type.
 *
 *   appearance  field · bare (no surface; the caller draws one)
 *   size        sm 32 · md 40 · lg 48 · area (a textarea)
 *   shape       card · pill
 */
export const inputVariants = variants(
  "w-full min-w-0 outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      appearance: {
        field:
          "bg-fill text-ink ring-1 ring-edge ring-inset placeholder:text-ink-muted hover:bg-fill-hover focus:bg-fill-hover focus:ring-edge-focus",
        bare: "",
      },
      size: {
        sm: "h-control-sm px-3 type-meta",
        md: "h-control-md px-4 type-body",
        lg: "h-control-lg px-5 type-body",
        area: "block min-h-control-lg px-4 py-3 type-body leading-6",
      },
      shape: { card: "rounded-card", pill: "rounded-full" },
    },
    defaultVariants: { appearance: "field", shape: "card" },
  },
);

export type InputVariants = VariantProps<typeof inputVariants>;
