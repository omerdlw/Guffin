// Draws lens maps off the main thread (see map-source.ts). The maps are pure
// functions of the lens shape, so the worker keeps no state beyond the edge
// lights it already drew.
import { drawEdgeLight, drawRefraction, fold } from "./maps";

export type MapJob = {
  id: number;
  slice: number;
  radius: number;
  bezel: number;
  density: number;
};

const edges = new Map<string, ReturnType<typeof drawEdgeLight>>();

self.onmessage = ({ data }: MessageEvent<MapJob>) => {
  const { id, slice, radius, bezel, density } = data;
  const shape = `${slice}r${radius}@${density}`;
  let edge = edges.get(shape);
  if (!edge) {
    edge = drawEdgeLight(slice, radius, density);
    edges.set(shape, edge);
  }
  // fold writes the edge light into the refraction bitmap's blue channel and
  // leaves the edge bitmap itself untouched, so it can be reused.
  const map = fold(drawRefraction(slice, radius, bezel, density), edge, slice);
  self.postMessage({ id, map });
};
