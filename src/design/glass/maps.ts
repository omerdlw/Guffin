// The lens maps a glass surface is drawn with, from the optics (optics.ts) and
// its material (materials.ts). Browser only (canvas).
//
// No map depends on the surface's size, only its corner radius and bezel:
// along a straight side the rim is the same everywhere. So each is drawn
// once, for a small square with the same corners, and laid out as nine
// slices (four corners, four stretched sides, an empty middle). A surface
// that resizes keeps the exact lens on every frame.

import { rimShift } from "./optics";

/** Points read across each pixel of a mask, per axis, on small masks… */
const SUPERSAMPLE = 4;
/** …and on large ones, where the cost grows with the square. */
const SUPERSAMPLE_LARGE = 2;
const LARGE_MASK = 96;

type Probe = (px: number, py: number) => [number, number, number];

/**
 * Measures a rounded rectangle at a point (css px from its centre): the
 * depth inside the outline (≤ 0 outside) and the outward normal of the
 * nearest edge.
 */
function prober(width: number, height: number, radius: number): Probe {
  const hx = width / 2;
  const hy = height / 2;
  const r = Math.min(radius, hx, hy);
  return (px, py) => {
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
    return [depth, nx * (Math.sign(px) || 1), ny * (Math.sign(py) || 1)];
  };
}

function paint(
  columns: number,
  rows: number,
  fill: (data: Uint8ClampedArray) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const image = context.createImageData(columns, rows);
  fill(image.data);
  context.putImageData(image, 0, 0);
  return canvas;
}

/**
 * The square every map is drawn for: corners of `slice` css px with a 2px
 * straight run between them, so each side's run is the rim as it is along
 * any straight side, however long.
 */
export const sideOf = (slice: number) => slice * 2 + 2;

/**
 * A mask around the outline of the square, at `density`. `shade` gets the
 * depth inside the outline (css px) and the outward normal of the nearest
 * edge, and returns the value there (0–1). `opaque` draws it as grey on
 * black (the value in the colour, full alpha): slices of it laid over one
 * another then replace each other where they meet instead of adding up
 * into a bright seam.
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
  opaque = false,
) {
  const side = sideOf(slice);
  const size = Math.round(side * density);
  const samples = size > LARGE_MASK ? SUPERSAMPLE_LARGE : SUPERSAMPLE;
  const probe = prober(side, side, radius);
  const alpha = new Float32Array(size * size);
  const step = 1 / (density * samples);
  const half = side / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let j = 0; j < samples; j++) {
        const py = y / density + (j + 0.5) * step - half;
        for (let i = 0; i < samples; i++) {
          const px = x / density + (i + 0.5) * step - half;
          const [depth, nx, ny] = probe(px, py);
          if (depth <= 0) continue;
          sum += Math.min(1, Math.max(0, shade(depth, nx, ny)));
        }
      }
      alpha[y * size + x] = sum / (samples * samples);
    }
  }
  return paint(size, size, (data) => {
    for (let i = 0; i < alpha.length; i++) {
      const at = i * 4;
      const value = Math.round(alpha[i]! * 255);
      data[at] = opaque ? value : 255;
      data[at + 1] = opaque ? value : 255;
      data[at + 2] = opaque ? value : 255;
      data[at + 3] = opaque ? 255 : value;
    }
  });
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
    true,
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
) {
  const side = sideOf(slice);
  const size = Math.round(side * density);
  const probe = prober(side, side, radius);
  const shift = new Float32Array(size * size * 2);
  for (let y = 0; y < size; y++) {
    const py = (y + 0.5) / density - side / 2;
    for (let x = 0; x < size; x++) {
      const [depth, nx, ny] = probe((x + 0.5) / density - side / 2, py);
      // The outline's own pixel (centre just outside) bends as the rim does.
      if (depth <= -0.5 / density || depth >= bezel) continue;
      const magnitude = rimShift(Math.max(depth, 0) / bezel);
      const index = y * size + x;
      // Sample inward of the pixel: the rim shows what lies further in.
      shift[index * 2] = -nx * magnitude;
      shift[index * 2 + 1] = -ny * magnitude;
    }
  }
  return paint(size, size, (data) => {
    for (let i = 0; i < size * size; i++) {
      const at = i * 4;
      data[at] = Math.round(128 + shift[i * 2]! * 127);
      data[at + 1] = Math.round(128 + shift[i * 2 + 1]! * 127);
      data[at + 2] = 128;
      data[at + 3] = 255;
    }
  });
}

/** The nine slices' order: four sides first, the corners laid over them. */
export const PIECES = ["t", "b", "l", "r", "tl", "tr", "bl", "br"] as const;
export type Piece = (typeof PIECES)[number];
export type Pieces = Record<Piece, string>;

/** Cuts a map drawn for the square into its eight rim pieces. */
function cut(canvas: HTMLCanvasElement, slice: number) {
  const k = canvas.width / sideOf(slice);
  const corner = Math.round(slice * k);
  const run = canvas.width - corner * 2;
  const far = canvas.width - corner;
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
    const part = document.createElement("canvas");
    part.width = w;
    part.height = h;
    const context = part.getContext("2d");
    if (!context) return null;
    context.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    pieces[piece] = part.toDataURL();
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
  refraction: HTMLCanvasElement,
  edge: HTMLCanvasElement | null,
  slice: number,
): Pieces | null {
  const context = refraction.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const { width, height } = refraction;
  const image = context.getImageData(0, 0, width, height);
  const glow = edge
    ?.getContext("2d", { willReadFrequently: true })
    ?.getImageData(0, 0, width, height).data;
  for (let at = 0; at < image.data.length; at += 4) {
    image.data[at + 2] = glow ? glow[at]! : 0;
  }
  context.putImageData(image, 0, 0);
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
