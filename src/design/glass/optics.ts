const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export const rimShift = (t: number) => {
  const u = clamp01(t);
  return 1 - Math.sqrt((2 - u) * u);
};

export function channelIndices(
  ior: number,
  abbe: number,
): [number, number, number] {
  const spread = (ior - 1) / Math.max(abbe, 1);
  return [ior - spread * 0.3, ior, ior + spread * 0.7];
}

export function channelSpread(
  ior: number,
  abbe: number,
): [number, number, number] {
  if (ior <= 1) return [1, 1, 1];
  const [red, green, blue] = channelIndices(ior, abbe);
  return [(red - 1) / (green - 1), 1, (blue - 1) / (green - 1)];
}
