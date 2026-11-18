// The lens maps a glass surface is drawn with, from the optics (optics.ts) and
// its material (materials.ts). Pure pixels: no canvas, no DOM.
//
// No map depends on the surface's size, only its corner radius and bezel:
// along a straight side the rim is the same everywhere. So each is drawn
// once, for a small square with the same corners, and laid out as nine
// slices (four corners, four stretched sides, an empty middle). A surface
// that resizes keeps the exact lens on every frame.

import { rimShift } from "./optics";
import { pngDataUrl } from "./png";

/** Points read across each pixel of a mask, per axis, on small masks… */
const SUPERSAMPLE = 4;
/** …and on large ones, where the cost grows with the square. */
const SUPERSAMPLE_LARGE = 2;
const LARGE_MASK = 96;

/** A map's pixels: `size` × `size`, RGBA, every pixel opaque. */
type Bitmap = { size: number; data: Uint8ClampedArray };

/**
 * Measures a rounded rectangle at a point (css px from its centre) into
 * `out`: the depth inside the outline (≤ 0 outside) and the outward normal
 * of the nearest edge. Written in place: it runs for every sample of every
 * pixel of every map.
 */
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

/**
 * The square every map is drawn for: corners of `slice` css px with a 2px
 * straight run between them, so each side's run is the rim as it is along
 * any straight side, however long.
 */
const sideOf = (slice: number) => slice * 2 + 2;

/**
 * A mask around the outline of the square, at `density`. `shade` gets the
 * depth inside the outline (css px) and the outward normal of the nearest
 * edge, and returns the value there (0–1). Drawn as grey on black (the
 * value in the colour, full alpha): slices of it laid over one another then
 * replace each other where they meet instead of adding up into a bright
 * seam.
 *
 * Each pixel is the average of several points across it: a line about a
 * pixel wide, read only at pixel centres, flickers along a curve and the
 * outline reads as steps.
 */
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
      // Float32, as the mask was always kept, so the grey rounds the same.
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

/**
 * Where light caught in the bezel comes back out: a band a few px deep that
 * the lens fills with the scene behind, brightened, so the edge glows in the
 * colours it sits on. Lit as iOS lights its rim: a key light from the top
 * left and a fill from the bottom right, each across ±90° of the outline's
 * normal, so the straight sides glow, the top-left and bottom-right corners
 * most, and the other two corners go dark. Grey on black (see `drawMask`).
 */
export const drawEdgeLight = (slice: number, radius: number, density: number) =>
  drawMask(
    slice,
    radius,
    density,
    (depth, nx, ny) => {
      const band = Math.exp(-depth / 0.9) + 0.25 * Math.exp(-depth / 2.6);
      // |n · (−1, −1)/√2|: the key (top left) and the fill (bottom right).
      const lit = Math.abs(nx + ny) / Math.SQRT2;
      return band * lit;
    },
  );

/**
 * The bend: per pixel, where in the scene the glass shows (as an offset
 * inward along the edge's normal, a share of the full pull), encoded in red
 * and green around 128. The engine sets the pull itself as the filter's
 * scale, so one map serves every material and strength.
 */
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
      // The outline's own pixel (centre just outside) bends as the rim does.
      if (depth > -0.5 / density && depth < bezel) {
        const magnitude = rimShift(Math.max(depth, 0) / bezel);
        // Sample inward of the pixel: the rim shows what lies further in.
        // Float32, as the shift was always kept, so the bytes round the same.
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

/** The nine slices' order: four sides first, the corners laid over them. */
export const PIECES = ["t", "b", "l", "r", "tl", "tr", "bl", "br"] as const;
export type Piece = (typeof PIECES)[number];
export type Pieces = Record<Piece, string>;

/** Cuts a map drawn for the square into its eight rim pieces. */
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

/**
 * Both lens maps in one set of slices: the bend in red and green (all the
 * displacement reads) and the edge light in blue. The filter then lays out
 * eight slices instead of sixteen; on the GPU every slice is a pass on
 * every frame the scene behind moves.
 */
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

/**
 * Where each piece goes on a `width` × `height` surface. The sides reach 1px
 * under the corners, so no seam opens where they meet at a fractional size.
 */
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
