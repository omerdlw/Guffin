// The kinds of glass. Each is a recipe the engine draws from: how dense the
// glass is, how wide its rim runs against the surface's size, how far in the
// rim reaches for the scene it shows, and how much it frosts. The numbers
// follow iOS 26.5's glass (regular and lens variants).
//
// A surface picks its glass with `data-glass="<name>"`, or by its classes
// (`materialOf`). `--liquid-bezel` (px) and `--liquid-bend` (× the bend) on
// a surface still override its glass for that one surface.

export type Material = {
  /** Refractive index at the d line (air 1.0, water 1.33, crown glass 1.5). */
  ior: number;
  /** Abbe number: low spreads the colours further. 0 keeps them together. */
  abbe: number;
  /**
   * The rim's width: `share` of the surface's short side, held to
   * [min, max] px. Narrow: the bend lives at the very edge.
   */
  bezel: {
    share: number;
    min: number;
    max: number;
    /**
     * Past `from` px of short side, the rim keeps widening by `share` of
     * every further px, up to `max`: a tall surface bends further in, a
     * small one is untouched.
     */
    grow?: { from: number; share: number; max: number };
  };
  /** How far in the outline reads the scene, in bezels (the full pull). */
  reach: number;
  /** × the pull. */
  bend: number;
  /**
   * The frost under the bend (px, standard deviation), from a small
   * surface (48px short side) to a large one (160px). 0 is clear glass.
   */
  frost: { small: number; large: number };
  /** The scene caught in the bezel and glowing back out of it. */
  edge: { gain: number; blur: number };
};

const BASE: Material = {
  ior: 1.52,
  abbe: 28,
  // iOS: rim 0.25 × the short side up to 20px, pull 0.8 × up to 60px.
  bezel: { share: 0.25, min: 4, max: 20 },
  reach: 3,
  bend: 1,
  frost: { small: 1.5, large: 3 },
  edge: { gain: 1.45, blur: 1.5 },
};

/** iOS's lens variant (thumbs, a drop): rim 0.18 × the size, pull 0.5 ×. */
const LENS = {
  bezel: { share: 0.18, min: 4, max: 20 },
  reach: 2.8,
  frost: { small: 0, large: 0 },
  edge: { gain: 1.25, blur: 0 },
};

export const MATERIALS = {
  /** Modals, menus, select menus, toasts. */
  shell: BASE,
  /** Dock controls, controls laid over a picture, the dock's cards. */
  float: {
    ...BASE,
    // A tall dock card bends further in; a button keeps iOS's rim.
    bezel: { ...BASE.bezel, grow: { from: 80, share: 0.2, max: 40 } },
    frost: { small: 1.25, large: 2.5 },
    edge: { gain: 1.5, blur: 1.25 },
  },
  /** Tooltips: small and read at a glance, so a heavier frost. */
  tip: { ...BASE, frost: { small: 5, large: 5 } },
  /** Clear glass over text: a drop of water. No frost, no colour split. */
  clear: { ...BASE, ...LENS, abbe: 0 },
  /** Clear glass over a picture: its colours split at the rim. */
  prism: { ...BASE, ...LENS, abbe: 14 },
} satisfies Record<string, Material>;

export type MaterialName = keyof typeof MATERIALS;

const isMaterial = (name: string | undefined): name is MaterialName =>
  Boolean(name && name in MATERIALS);

/**
 * The glass a surface is made of: its `data-glass`, else read from the
 * classes it carried before glass had names.
 */
export function materialOf(element: Element): MaterialName | null {
  const named = (element as HTMLElement).dataset?.glass;
  if (isMaterial(named)) return named;
  const list = element.classList;
  if (list.contains("liquid-prism")) return "prism";
  if (list.contains("liquid-clear")) return "clear";
  if (!list.contains("liquid-lens")) return null;
  if (list.contains("liquid-tip")) return "tip";
  return list.contains("liquid-flat") ? "float" : "shell";
}

/**
 * The rim's width moves in steps this wide (px): a card that resizes (the
 * dock morphing into a surface) then reuses a handful of drawn maps instead
 * of drawing new ones every frame.
 */
const BEZEL_STEP = 2;
/** …and wider ones past iOS's 20px, so a morphing card redraws rarely. */
const WIDE_STEP = 4;
const WIDE = 20;

/** The rim's width for a surface of this size, in whole px. */
export function bezelFor(material: Material, width: number, height: number) {
  const short = Math.min(width, height);
  const { share, min, max, grow } = material.bezel;
  let wanted = Math.min(Math.max(short * share, min), max);
  if (grow && short > grow.from) {
    wanted = Math.min(wanted + (short - grow.from) * grow.share, grow.max);
  }
  const step = wanted > WIDE ? WIDE_STEP : BEZEL_STEP;
  const stepped = Math.round(wanted / step) * step;
  return Math.max(1, Math.floor(Math.min(stepped, short / 2)));
}

/** Frost moves in steps this fine (px): a resize redraws it rarely. */
const FROST_STEP = 0.25;
const FROST_SMALL = 48;
const FROST_LARGE = 160;

/** The frost for a surface of this size (iOS: grows from 48 to 160px). */
export function frostFor(material: Material, width: number, height: number) {
  const { small, large } = material.frost;
  const t = Math.min(
    Math.max(
      (Math.min(width, height) - FROST_SMALL) / (FROST_LARGE - FROST_SMALL),
      0,
    ),
    1,
  );
  return Math.round((small + (large - small) * t) / FROST_STEP) * FROST_STEP;
}
