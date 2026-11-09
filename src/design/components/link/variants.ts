import { INLINE_LINK, TONE } from "../../foundations/tones";
import { type VariantProps, variants } from "../../foundations/variants";

/**
 * Text that navigates or acts, without a surface. Links never dim on hover;
 * the line or the ink brightens instead.
 *
 *   inline    a link inside running text: always underlined
 *   reveal    a name or title: underlined only when pointed at
 *   hairline  a fact value: a hairline under it
 *   label     a small-caps text action (Show all, View more)
 *   quiet     plain ink that rises to full ink
 */
export const linkVariants = variants("cursor-pointer outline-none", {
  variants: {
    variant: {
      inline: INLINE_LINK,
      reveal:
        "cine-fade underline decoration-transparent underline-offset-2 hover:text-ink hover:decoration-current focus-visible:text-ink focus-visible:decoration-current",
      hairline:
        "cine-fade border-b border-ink-faint hover:border-ink-muted focus-visible:border-ink-muted",
      label: TONE.link,
      quiet: "text-ink-body hover:text-ink focus-visible:text-ink",
    },
  },
  defaultVariants: { variant: "inline" },
});

export type LinkVariants = VariantProps<typeof linkVariants>;
