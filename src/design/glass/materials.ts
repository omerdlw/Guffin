export type Material = {
  ior: number;
  abbe: number;
  bezel: {
    share: number;
    min: number;
    max: number;
    grow?: { from: number; share: number; max: number };
  };
  reach: number;
  bend: number;
  frost: { small: number; large: number };
  edge: { gain: number; blur: number };
};

const BASE: Material = {
  ior: 1.52,
  abbe: 28,
  bezel: { share: 0.25, min: 4, max: 20 },
  reach: 3,
  bend: 1,
  frost: { small: 2, large: 4 },
  edge: { gain: 1.45, blur: 1.5 },
};

const LENS = {
  bezel: { share: 0.18, min: 4, max: 20 },
  reach: 2.8,
  frost: { small: 0, large: 0 },
  edge: { gain: 1.25, blur: 0 },
};

export const MATERIALS = {
  shell: BASE,
  float: {
    ...BASE,
    bezel: { ...BASE.bezel, grow: { from: 80, share: 0.2, max: 40 } },
    frost: { small: 2, large: 5 },
    edge: { gain: 1.5, blur: 1.25 },
  },
  tip: { ...BASE, frost: { small: 5, large: 5 } },
  clear: { ...BASE, ...LENS, abbe: 0 },
  prism: { ...BASE, ...LENS, abbe: 14 },
} satisfies Record<string, Material>;

export type MaterialName = keyof typeof MATERIALS;

const isMaterial = (name: string | undefined): name is MaterialName =>
  Boolean(name && name in MATERIALS);

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

const BEZEL_STEP = 2;
const WIDE_STEP = 4;
const WIDE = 20;

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

const FROST_STEP = 0.25;
const FROST_SMALL = 48;
const FROST_LARGE = 160;

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
