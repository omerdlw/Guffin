export const TONES = {
  neutral:
    "bg-fill text-ink-body ring-1 ring-edge ring-inset hover:bg-fill-hover hover:text-ink hover:ring-edge-hover",
  outline:
    "ui-iris bg-transparent text-ink-body ring-1 ring-edge-hover ring-inset hover:text-ink hover:ring-edge-focus",
  chosen:
    "rim bg-chosen text-chosen-ink ring-1 ring-chosen-edge ring-inset hover:bg-chosen-hover hover:ring-chosen-edge-hover [--rim-key:var(--rim-chosen-key)] [--rim-fill:var(--rim-chosen-fill)] [--rim-shade:var(--rim-chosen-shade)]",
  primary:
    "ui-sheen bg-primary text-on-primary ring-1 ring-primary ring-inset [--sheen-ink:var(--sheen-primary)] [--sheen:0.1] hover:bg-primary-hover disabled:not-aria-busy:bg-fill-hover disabled:not-aria-busy:text-ink disabled:not-aria-busy:ring-edge aria-disabled:not-aria-busy:bg-fill-hover aria-disabled:not-aria-busy:text-ink aria-disabled:not-aria-busy:ring-edge",
  danger:
    "bg-danger/15 text-danger ring-1 ring-danger/25 ring-inset hover:bg-danger/20 hover:ring-danger/30",
  armed: "bg-danger text-on-accent ring-1 ring-danger ring-inset",
  glass: "liquid liquid-flat liquid-lens text-ink",
  ghost:
    "ui-iris bg-transparent text-ink-body ring-1 ring-transparent ring-inset hover:text-ink",
} as const;

export const STATE = {
  disabled:
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  busy: "aria-busy:cursor-wait disabled:aria-busy:opacity-100",
} as const;

export const FILL =
  "bg-fill ring-1 ring-edge ring-inset hover:bg-fill-hover hover:ring-edge-hover";

export const WELL =
  "bg-(--liquid-well) ring-1 ring-(color:--liquid-well-edge) ring-inset shadow-(--liquid-well-shadow)";
export const WELL_HOVER =
  "hover:bg-(--liquid-well-hover) active:bg-(--liquid-well-active)";

export const LAYER = {
  shell: "liquid liquid-lens",
  tip: "liquid liquid-lens liquid-tip text-ink-lead",
  veil: "bg-veil",
  dim: "bg-dim",
} as const;

export const PRIMARY = TONES.primary;

const PAGE_GLASS = "liquid liquid-flat liquid-lens rounded-full text-ink";

const PAGE_BAR = `${PAGE_GLASS} [--liquid-lens-tone:var(--liquid-lens-tone-bar)] [--liquid-tint:var(--liquid-tint-bar)]`;

export const TONE = {
  arrows: PAGE_GLASS,
  bar: PAGE_BAR,
  chosen: TONES.chosen,
  glass: PAGE_GLASS,
  label: "type-label font-semibold tracking-label uppercase",
  link: "type-label font-semibold tracking-label uppercase text-ink-muted hover:text-ink",
  rule: "bg-rule",
  rules: "divide-rule",
  surface: TONES.neutral,
} as const;

export const INLINE_LINK =
  "underline decoration-ink-faint underline-offset-2 hover:text-ink hover:decoration-ink-muted";

export const ACTION_TONE =
  "bg-primary/10 text-primary hover:bg-primary hover:text-on-primary";
