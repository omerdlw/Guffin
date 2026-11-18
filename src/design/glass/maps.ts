import { rimShift } from "./optics";
import { pngDataUrl } from "./png";

const SUPERSAMPLE = 4;
const SUPERSAMPLE_LARGE = 2;
const LARGE_MASK = 96;

type Bitmap = { size: number; data: Uint8ClampedArray };

type Probe = (px: number, py: number, out: Float64Array) => void;

function prober(width: number, height: number, radius: number): Probe {
  const hx = width / 2;
  const hy = height / 2;
  const r = Math.min(radius, hx, hy);
  return (px, py, out) => {
    const qx = Math.abs(px) - (hx - r);
    const qy = Math.abs(py) - (hy - r);
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const outside = Math.hypot(ox, oy);
    const depth = r - outside - Math.min(Math.max(qx, qy), 0);
    let nx: number;
    let ny: number;
    if (ox > 0 && oy > 0) {
      nx = ox / outside;
      ny = oy / outside;
    } else if (qx > qy) {
      nx = 1;
      ny = 0;
    } else {
      nx = 0;
      ny = 1;
    }
    out[0] = depth;
    out[1] = nx * (Math.sign(px) || 1);
    out[2] = ny * (Math.sign(py) || 1);
  };
}

const sideOf = (slice: number) => slice * 2 + 2;

function drawMask(
  slice: number,
  radius: number,
  density: number,
  shade: (depth: number, nx: number, ny: number) => number,
): Bitmap {
  const side = sideOf(slice);
  const size = Math.round(side * density);
  const samples = size > LARGE_MASK ? SUPERSAMPLE_LARGE : SUPERSAMPLE;
  const probe = prober(side, side, radius);
  const at = new Float64Array(3);
  const data = new Uint8ClampedArray(size * size * 4);
  const step = 1 / (density * samples);
  const half = side / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let j = 0; j < samples; j++) {
        const py = y / density + (j + 0.5) * step - half;
        for (let i = 0; i < samples; i++) {
          const px = x / density + (i + 0.5) * step - half;
          probe(px, py, at);
          if (at[0]! <= 0) continue;
          sum += Math.min(1, Math.max(0, shade(at[0]!, at[1]!, at[2]!)));
        }
      }
      const value = Math.round(Math.fround(sum / (samples * samples)) * 255);
      const index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return { size, data };
}

export const drawEdgeLight = (slice: number, radius: number, density: number) =>
  drawMask(slice, radius, density, (depth, nx, ny) => {
    const band = Math.exp(-depth / 0.9) + 0.25 * Math.exp(-depth / 2.6);
    const lit = Math.abs(nx + ny) / Math.SQRT2;
    return band * lit;
  });

export function drawRefraction(
  slice: number,
  radius: number,
  bezel: number,
  density: number,
): Bitmap {
  const side = sideOf(slice);
  const size = Math.round(side * density);
  const probe = prober(side, side, radius);
  const at = new Float64Array(3);
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const py = (y + 0.5) / density - side / 2;
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      let sx = 0;
      let sy = 0;
      probe((x + 0.5) / density - side / 2, py, at);
      const depth = at[0]!;
      if (depth > -0.5 / density && depth < bezel) {
        const magnitude = rimShift(Math.max(depth, 0) / bezel);
        sx = Math.fround(-at[1]! * magnitude);
        sy = Math.fround(-at[2]! * magnitude);
      }
      data[index] = Math.round(128 + sx * 127);
      data[index + 1] = Math.round(128 + sy * 127);
      data[index + 2] = 128;
      data[index + 3] = 255;
    }
  }
  return { size, data };
}

export const PIECES = ["t", "b", "l", "r", "tl", "tr", "bl", "br"] as const;
export type Piece = (typeof PIECES)[number];
export type Pieces = Record<Piece, string>;

function cut({ size, data }: Bitmap, slice: number): Pieces {
  const k = size / sideOf(slice);
  const corner = Math.round(slice * k);
  const run = size - corner * 2;
  const far = size - corner;
  const boxes: Record<Piece, [number, number, number, number]> = {
    t: [corner, 0, run, corner],
    b: [corner, far, run, corner],
    l: [0, corner, corner, run],
    r: [far, corner, corner, run],
    tl: [0, 0, corner, corner],
    tr: [far, 0, corner, corner],
    bl: [0, far, corner, corner],
    br: [far, far, corner, corner],
  };
  const pieces = {} as Pieces;
  for (const piece of PIECES) {
    const [x, y, w, h] = boxes[piece];
    const part = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      const from = ((y + row) * size + x) * 4;
      part.set(data.subarray(from, from + w * 4), row * w * 4);
    }
    pieces[piece] = pngDataUrl(w, h, part);
  }
  return pieces;
}

export function fold(
  refraction: Bitmap,
  edge: Bitmap | null,
  slice: number,
): Pieces {
  const data = refraction.data;
  const glow = edge?.data;
  for (let at = 0; at < data.length; at += 4) {
    data[at + 2] = glow ? glow[at]! : 0;
  }
  return cut(refraction, slice);
}

export function layout(slice: number, width: number, height: number) {
  const s = slice;
  const across = Math.max(width - s * 2 + 2, 0);
  const down = Math.max(height - s * 2 + 2, 0);
  const boxes: Record<Piece, [number, number, number, number]> = {
    t: [s - 1, 0, across, s],
    b: [s - 1, height - s, across, s],
    l: [0, s - 1, s, down],
    r: [width - s, s - 1, s, down],
    tl: [0, 0, s, s],
    tr: [width - s, 0, s, s],
    bl: [0, height - s, s, s],
    br: [width - s, height - s, s, s],
  };
  return boxes;
}
