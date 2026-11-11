import {
  FILL,
  STATE,
  TONES,
  type Tone,
} from "@omerdlw/base-framework/ui/recipes";

export { FILL, STATE, TONES, type Tone };

export const PRIMARY = TONES.primary;

const PAGE_GLASS =
  "rounded-full bg-veil text-ink ring-1 ring-edge-hover ring-inset backdrop-saturate-150";

export const TONE = {
  arrows: `${PAGE_GLASS} hover:bg-glass focus-visible:bg-glass`,
  chosen: TONES.chosen,
  glass: PAGE_GLASS,
  label: "type-label font-semibold tracking-label uppercase",
  link: "cine-fade type-label font-semibold tracking-label uppercase text-ink-muted hover:text-ink focus-visible:text-ink",
  rule: "bg-rule",
  rules: "divide-rule",
  surface: TONES.neutral,
} as const;

export const INLINE_LINK =
  "underline decoration-ink-faint underline-offset-2 hover:text-ink focus-visible:text-ink hover:decoration-ink-muted focus-visible:decoration-ink-muted";
