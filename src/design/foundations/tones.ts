export const TONES = {
  neutral:
    "bg-fill text-ink-body ring-1 ring-edge ring-inset hover:bg-fill-hover hover:text-ink hover:ring-edge-hover focus-visible:bg-fill-hover focus-visible:text-ink focus-visible:ring-edge-focus",
  outline:
    "ui-iris bg-transparent text-ink-body ring-1 ring-edge-hover ring-inset hover:text-ink hover:ring-edge-focus focus-visible:text-ink focus-visible:ring-edge-focus",
  chosen:
    "bg-chosen text-chosen-ink ring-1 ring-chosen-edge ring-inset hover:bg-chosen-hover hover:ring-chosen-edge-hover focus-visible:bg-chosen-hover focus-visible:ring-chosen-edge-hover",
  primary:
    "ui-sheen bg-primary text-on-primary ring-1 ring-primary ring-inset [--sheen-ink:var(--sheen-primary)] [--sheen:0.1] hover:bg-primary-hover focus-visible:bg-primary-hover",
  danger:
    "bg-danger/15 text-danger ring-1 ring-danger/25 ring-inset hover:bg-danger/20 hover:ring-danger/30 focus-visible:bg-danger/20 focus-visible:ring-danger/30",
  armed: "bg-danger text-on-accent ring-1 ring-danger ring-inset",
  glass: "liquid liquid-flat liquid-lens text-ink",
  ghost:
    "ui-iris bg-transparent text-ink-body ring-1 ring-transparent ring-inset hover:text-ink focus-visible:text-ink",
} as const;

export const STATE = {
  disabled:
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  busy: "aria-busy:cursor-wait disabled:aria-busy:opacity-100",
} as const;

export const FILL =
  "bg-fill ring-1 ring-edge ring-inset hover:bg-fill-hover hover:ring-edge-hover focus-visible:bg-fill-hover focus-visible:ring-edge-focus";

// A control inside a glass layer (the dock and its surfaces): a fill, never
// glass on glass. A white pill on paper, a white tint over a picture.
export const WELL = "bg-(--liquid-well) shadow-(--liquid-well-shadow)";
export const WELL_HOVER =
  "hover:bg-(--liquid-well-hover) focus-visible:bg-(--liquid-well-hover)";

export const LAYER = {
  shell: "liquid liquid-lens",
  tip: "liquid liquid-lens liquid-tip text-ink-lead",
  veil: "bg-veil",
  dim: "bg-dim",
} as const;

export const PRIMARY = TONES.primary;

const PAGE_GLASS = "liquid liquid-flat liquid-lens rounded-full text-ink";

export const TONE = {
  arrows: PAGE_GLASS,
  chosen: TONES.chosen,
  glass: PAGE_GLASS,
  label: "type-label font-semibold tracking-label uppercase",
  link: "type-label font-semibold tracking-label uppercase text-ink-muted hover:text-ink focus-visible:text-ink",
  rule: "bg-rule",
  rules: "divide-rule",
  surface: TONES.neutral,
} as const;

export const INLINE_LINK =
  "underline decoration-ink-faint underline-offset-2 hover:text-ink focus-visible:text-ink hover:decoration-ink-muted focus-visible:decoration-ink-muted";

export const ACTION_TONE =
  "bg-primary/10 text-primary hover:bg-primary hover:text-on-primary focus-visible:bg-primary focus-visible:text-on-primary";
