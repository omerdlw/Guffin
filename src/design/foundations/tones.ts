/**
 * The interaction contract in class form. Each tone is one complete answer to
 * rest, hover, focus-visible and active, written against colour roles only,
 * so the two themes can give the same tone different values.
 *
 * Rules every tone obeys (design/rules/07-interaction.md, §4):
 * - hover and focus-visible are one event: every `hover:` has a
 *   `focus-visible:` twin;
 * - a control rests at `ink-body` or brighter and rises to `ink`;
 * - the outline is drawn by the system (styles/interaction.css), never here;
 * - press (scale and blur) is global; tones only colour it.
 *
 * The motion of these changes (the two beats, the press) lives in
 * styles/interaction.css, so tones never name a duration.
 */
export const TONES = {
  /** A quiet surface: 5% fill, ring, ink-body rising to ink. */
  neutral:
    "bg-fill text-ink-body ring-1 ring-edge ring-inset hover:bg-fill-hover hover:text-ink hover:ring-edge-hover focus-visible:bg-fill-hover focus-visible:text-ink focus-visible:ring-edge-focus",
  /** A hairline and no fill: the quiet action beside a row's text. */
  outline:
    "ui-iris bg-transparent text-ink-body ring-1 ring-edge-hover ring-inset hover:text-ink hover:ring-edge-focus focus-visible:text-ink focus-visible:ring-edge-focus",
  /** A chosen control takes the picture's grade, never white. */
  chosen:
    "bg-grade/15 text-grade ring-1 ring-grade/25 ring-inset hover:bg-grade/20 hover:ring-grade/30 focus-visible:bg-grade/20 focus-visible:ring-grade/30",
  /** The one primary action on a surface. */
  primary:
    "ui-sheen bg-primary text-on-primary ring-1 ring-primary ring-inset [--sheen-ink:var(--sheen-primary)] [--sheen:0.1] hover:bg-primary-hover focus-visible:bg-primary-hover",
  /** A destructive action, soft until armed. */
  danger:
    "bg-danger/15 text-danger ring-1 ring-danger/25 ring-inset hover:bg-danger/20 hover:ring-danger/30 focus-visible:bg-danger/20 focus-visible:ring-danger/30",
  /** A destructive action armed for its second press. */
  armed: "bg-danger text-on-accent ring-1 ring-danger ring-inset",
  /** A control floating over a picture. */
  glass:
    "bg-veil text-ink ring-1 ring-edge-hover ring-inset backdrop-saturate-150 hover:bg-glass focus-visible:bg-glass",
  /** No surface at rest; a fill blooms out of the centre when pointed at. */
  ghost:
    "ui-iris bg-transparent text-ink-body ring-1 ring-transparent ring-inset hover:text-ink focus-visible:text-ink",
} as const;

export type Tone = keyof typeof TONES;

/**
 * Disabled and busy, the same everywhere: a disabled control dims to 50% and
 * stops taking the pointer; a busy one keeps its colour and shows a wait
 * cursor while its loader runs.
 */
export const STATE = {
  disabled:
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  busy: "aria-busy:cursor-wait disabled:aria-busy:opacity-100",
} as const;

/** The neutral surface without its ink, for a control that sets its own. */
export const FILL =
  "bg-fill ring-1 ring-edge ring-inset hover:bg-fill-hover hover:ring-edge-hover focus-visible:bg-fill-hover focus-visible:ring-edge-focus";

/** The primary tone, for a framework slot that cannot call a recipe. */
export const PRIMARY = TONES.primary;

const PAGE_GLASS =
  "rounded-full bg-veil text-ink ring-1 ring-edge-hover ring-inset backdrop-saturate-150";

/**
 * Named tones for elements that are not design-system components (a heading
 * label, a divider, glass laid over a picture). A control is never styled from
 * here: it is a component with an `intent`.
 */
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

/** A link inside running text: always underlined, the line brightens on point. */
export const INLINE_LINK =
  "underline decoration-ink-faint underline-offset-2 hover:text-ink focus-visible:text-ink hover:decoration-ink-muted focus-visible:decoration-ink-muted";
