// The optics of a slab of liquid glass. Pure maths, no DOM: the maps
// (maps.ts) and the engine (engine.tsx) are drawn from it.
//
// The rim follows iOS 26's glass: a narrow bezel whose bend is strongest at
// the outline and gone a bezel's width in, shaped as a sphere's cap. The
// scene seen through the outline comes from a few bezels further in (the
// material's `reach`), so the edge reads as liquid pulled over the scene.
// One refractive index per colour channel, from the glass's Abbe number,
// splits red and blue a little apart (dispersion).

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * How far the scene is pulled in at depth `t` into the rim (0 the outline,
 * 1 a bezel's width in), as a share of the full pull: 1 − √(1 − (1 − t)²),
 * a sphere's cap. Steep at the outline, flat by the end of the bezel.
 */
export const rimShift = (t: number) => {
  const u = clamp01(t);
  return 1 - Math.sqrt((2 - u) * u);
};

/**
 * Refractive indices for red (C line, 656nm), green (d, 588nm) and blue
 * (F, 486nm) from the index at d and the Abbe number: n_F − n_C =
 * (n_d − 1) / V. A low V spreads the colours further (flint glass ~30).
 */
export function channelIndices(
  ior: number,
  abbe: number,
): [number, number, number] {
  const spread = (ior - 1) / Math.max(abbe, 1);
  return [ior - spread * 0.3, ior, ior + spread * 0.7];
}

/**
 * How far each channel bends against green, the reference: the bend grows
 * with n − 1, so a red ray bends a little less and blue a little more.
 */
export function channelSpread(
  ior: number,
  abbe: number,
): [number, number, number] {
  if (ior <= 1) return [1, 1, 1];
  const [red, green, blue] = channelIndices(ior, abbe);
  return [(red - 1) / (green - 1), 1, (blue - 1) / (green - 1)];
}
