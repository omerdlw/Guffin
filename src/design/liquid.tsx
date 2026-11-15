"use client";

import { useEffect } from "react";

// Liquid glass. Every `.liquid` surface is treated as a slab of glass with a
// rounded bezel and gets two maps:
//
// - a specular map: where the curved rim catches a light from the top left
//   (a hairline core and a soft bloom, brightest on the corners that face the
//   light and their opposites, faint along the sides). It is an alpha mask;
//   the theme colours it (liquid.css), so the glint suits either theme.
// - on `liquid-lens` surfaces in Chromium, a displacement map: rays meet a
//   convex squircle profile, refract by Snell's law (air 1.0 → glass 1.5) and
//   land inward of where they entered, so the scene behind bends at the rim
//   and stays still in the middle. Each colour channel bends a little
//   differently (dispersion). Only Chromium runs SVG filters inside
//   backdrop-filter; elsewhere the variable stays unset and the surface keeps
//   its frost.
//
// Neither map depends on the surface's size, only on its corner radius and
// bezel: along a straight side the rim is the same everywhere. So each is
// drawn once, for a small square with the same corners, and laid out as nine
// slices (four corners, four stretched sides, an empty middle). A surface
// that resizes (the dock unfolding into a surface) keeps the exact glint and
// the exact lens on every frame: the specular is a CSS mask-box-image, which
// the browser lays out itself, and the lens's slices are moved to the new
// size in the same frame, before it paints.

const SVG_NS = "http://www.w3.org/2000/svg";
const SELECTOR = ".liquid";
const LENS = "liquid-lens";
/** A lens without frost: clear glass, like a drop of water (the cursor). */
const CLEAR = "liquid-clear";
/**
 * A surface that morphs every frame (the cursor's pane): its corners change
 * with its size, so it keeps the size-free CSS rim instead.
 */
const FLUID = "liquid-fluid";
/**
 * Clear glass laid on a picture rather than text: its colours split at the
 * rim (nothing there to fringe), so the edge reads as glass.
 */
const PRISM = "liquid-prism";
const REFRACTIVE_INDEX = 1.5;
const SAMPLES = 128;
const MIN_SIDE = 16;
/** Red bends a little more than green, blue a little less. */
const DISPERSION = 0.07;
/**
 * How the edge light brightens the scene it carries: colours ×1.3 plus a
 * touch of white, so it glows over a picture and stays faint over a dark
 * page.
 */
const EDGE_GAIN = 1.3;
/**
 * The edge light carries the scene a little softened (px, standard
 * deviation): sharp, it read as a clear window cut round the frost.
 */
const EDGE_BLUR = 1.75;
/** Clear glass over text: a gentler edge light, so letters do not flare. */
const CLEAR_EDGE_GAIN = 1.25;
/** …and a gentler bend, so letters at the rim stay letters. */
const CLEAR_BEND = 0.5;
/** Glass thickness against the bezel's width: the bend reaches ~0.9 × bezel. */
const THICKNESS = 1.9;
/**
 * The lens's own frost (px, the blur's standard deviation): light, so the
 * scene behind keeps its shapes and the bend at the rim reads as glass.
 */
const FROST_BLUR = 4;
const EDGE_LIFT = 0.05;
/**
 * How deep the lens's slices reach (css px) at least: the edge light fades
 * out over ~12px, deeper than a small bezel.
 */
const EDGE_REACH = 12;
/** The glint's bloom fades out within ~8px of the outline. */
const GLINT_REACH = 8;
/** Light from the top left. */
const LIGHT_X = -Math.SQRT1_2;
const LIGHT_Y = -Math.SQRT1_2;

const squircle = (t: number) => Math.pow(1 - Math.pow(1 - t, 4), 0.25);

/** Width of the curved rim for a surface: a third of its short side, ≤ 28px. */
const bezelOf = (width: number, height: number, radius: number) =>
  Math.max(
    6,
    Math.min(Math.max(radius, 12), 28, Math.min(width, height) * 0.34),
  );

// Displacement in px across the bezel, from the outer edge (0) inwards (1).
function bezelSlice(bezel: number, thickness: number): Float32Array {
  const slice = new Float32Array(SAMPLES);
  const delta = 0.001;
  for (let i = 0; i < SAMPLES; i++) {
    const t = Math.min(Math.max(i / (SAMPLES - 1), delta), 1 - delta);
    const slope =
      ((squircle(t + delta) - squircle(t - delta)) / (2 * delta)) *
      (thickness / bezel);
    const incidence = Math.atan(slope);
    const refracted = Math.asin(Math.sin(incidence) / REFRACTIVE_INDEX);
    slice[i] = thickness * squircle(t) * Math.tan(incidence - refracted);
  }
  return slice;
}

/**
 * Walks a rounded rectangle pixel by pixel. `visit` gets the depth inside the
 * outline in css px (≤ 0 outside) and the outward normal of the nearest edge.
 */
function walk(
  width: number,
  height: number,
  radius: number,
  density: number,
  visit: (index: number, depth: number, nx: number, ny: number) => void,
) {
  const hx = width / 2;
  const hy = height / 2;
  const r = Math.min(radius, hx, hy);
  const columns = Math.round(width * density);
  const rows = Math.round(height * density);
  for (let y = 0; y < rows; y++) {
    const py = (y + 0.5) / density - hy;
    const qy = Math.abs(py) - (hy - r);
    for (let x = 0; x < columns; x++) {
      const px = (x + 0.5) / density - hx;
      const qx = Math.abs(px) - (hx - r);
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
      visit(
        y * columns + x,
        depth,
        nx * (Math.sign(px) || 1),
        ny * (Math.sign(py) || 1),
      );
    }
  }
  return { columns, rows };
}

function paint(
  columns: number,
  rows: number,
  fill: (data: Uint8ClampedArray) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d");
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
const sideOf = (slice: number) => slice * 2 + 2;

/**
 * A white alpha mask around the outline of the square, at `density`. `shade`
 * gets the depth inside the outline (css px) and how squarely the edge faces
 * the light (1 facing it, −1 facing away) and returns the alpha there.
 * `opaque` draws it as grey on black instead (the value in the colour, full
 * alpha): slices of it laid over one another then replace each other where
 * they meet instead of adding up into a bright seam.
 */
function drawMask(
  slice: number,
  radius: number,
  density: number,
  shade: (depth: number, facing: number) => number,
  opaque = false,
) {
  const side = sideOf(slice);
  const size = Math.round(side * density);
  const alpha = new Float32Array(size * size);
  const { columns, rows } = walk(
    side,
    side,
    radius,
    density,
    (index, depth, nx, ny) => {
      if (depth <= 0) return;
      const value = shade(depth, nx * LIGHT_X + ny * LIGHT_Y);
      alpha[index] = Math.min(1, value) * Math.min(1, depth * density);
    },
  );
  return paint(columns, rows, (data) => {
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
 * The glint: one crisp line on the outline, bright on the corner facing the
 * light, a little on the opposite one, a whisper along the sides. Drawn by
 * CSS in the theme's colour.
 */
const drawSpecular = (slice: number, radius: number, density: number) =>
  drawMask(slice, radius, density, (depth, facing) => {
    const glint = facing > 0 ? facing ** 4 : 0.45 * (-facing) ** 4;
    // A soft bloom inside the line, wider round the lit corners, so the rim
    // reads as a curved, thick edge catching the light.
    const spread = facing > 0 ? facing ** 2 : 0.5 * (-facing) ** 2;
    return (
      (0.1 + 0.9 * glint) * Math.exp(-depth / 0.45) +
      0.3 * spread * Math.exp(-depth / 2.5)
    );
  });

/**
 * Where light caught in the bezel comes back out: a band a few px deep that
 * the lens fills with the scene behind, brightened, so the edge glows in the
 * colours it sits on. Even all round, a little stronger on the lit corners.
 */
const drawEdgeLight = (slice: number, radius: number, density: number) =>
  drawMask(
    slice,
    radius,
    density,
    (depth, facing) => {
      const weight = 0.45 + 0.55 * facing ** 2;
      return (
        weight * (0.85 * Math.exp(-depth / 1.1) + 0.3 * Math.exp(-depth / 3.5))
      );
    },
    true,
  );

function drawRefraction(slice: number, radius: number, bezel: number) {
  const profile = bezelSlice(bezel, bezel * THICKNESS);
  let max = 0;
  for (const value of profile) max = Math.max(max, Math.abs(value));
  if (max === 0) return null;
  const side = sideOf(slice);
  const shift = new Float32Array(side * side * 2);
  const { columns, rows } = walk(
    side,
    side,
    radius,
    1,
    (index, depth, nx, ny) => {
      if (depth <= 0 || depth >= bezel) return;
      const magnitude =
        profile[Math.round((depth / bezel) * (SAMPLES - 1))]! / max;
      // Sample inward of the pixel: the rim shows what lies further in.
      shift[index * 2] = -nx * magnitude;
      shift[index * 2 + 1] = -ny * magnitude;
    },
  );
  const canvas = paint(columns, rows, (data) => {
    for (let i = 0; i < columns * rows; i++) {
      const at = i * 4;
      data[at] = Math.round(128 + shift[i * 2]! * 127);
      data[at + 1] = Math.round(128 + shift[i * 2 + 1]! * 127);
      data[at + 2] = 128;
      data[at + 3] = 255;
    }
  });
  return canvas ? { canvas, scale: max * 2 } : null;
}

/** The nine slices' order: four sides first, the corners laid over them. */
const PIECES = ["t", "b", "l", "r", "tl", "tr", "bl", "br"] as const;
type Piece = (typeof PIECES)[number];
type Pieces = Record<Piece, string>;

/** Cuts a map drawn for the square into its eight rim pieces. */
function cut(canvas: HTMLCanvasElement, slice: number): Pieces | null {
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
 * Where each piece goes on a `width` × `height` surface. The sides reach 1px
 * under the corners, so no seam opens where they meet at a fractional size.
 */
function layout(slice: number, width: number, height: number) {
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

const HYDRATION_RETRY_MS = 250;

/** React marks every DOM node it owns with a `__reactFiber$…` key. */
const hydrated = (element: Element) =>
  Object.keys(element).some((key) => key.startsWith("__reactFiber$"));

function refracts() {
  const data = (
    navigator as Navigator & {
      userAgentData?: { brands: { brand: string }[] };
    }
  ).userAgentData;
  return Boolean(data?.brands.some(({ brand }) => brand === "Chromium"));
}

/** The glint is a nine-slice mask: Chromium and WebKit. */
const masksBoxes = () =>
  typeof CSS !== "undefined" &&
  CSS.supports("-webkit-mask-box-image-source", "none");

function radiusOf(element: Element, width: number, height: number) {
  const value = parseFloat(getComputedStyle(element).borderTopLeftRadius);
  return Math.min(Number.isFinite(value) ? value : 0, width / 2, height / 2);
}

function set(
  element: Element,
  name: string,
  attributes: Record<string, string | number>,
) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  element.append(node);
  return node;
}

/** Keeps one colour channel of `input` (0 r, 1 g, 2 b). */
const CHANNEL = [
  "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
];

type LensMaps = {
  slice: number;
  scale: number;
  map: Pieces;
  band: Pieces | null;
};

/** One surface's own lens: a filter whose slices follow its size. */
type Lens = {
  key: string;
  filter: SVGFilterElement;
  slice: number;
  map: Record<Piece, SVGElement>;
  band: Record<Piece, SVGElement> | null;
  flat: SVGElement;
  dark: SVGElement | null;
  width: number;
  height: number;
};

function startLiquid(lensing: boolean) {
  const glinting = masksBoxes();
  const defs = document.createElementNS(SVG_NS, "svg");
  defs.setAttribute("aria-hidden", "true");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.style.position = "absolute";
  defs.style.pointerEvents = "none";
  document.body.append(defs);

  const density = Math.min(window.devicePixelRatio || 1, 2);
  const speculars = new Map<string, string | null>();
  const maps = new Map<string, LensMaps | null>();
  const glints = new WeakMap<Element, string>();
  const lenses = new Map<Element, Lens>();
  const sizes = new WeakMap<Element, { width: number; height: number }>();
  const timers = new WeakMap<Element, number>();
  let count = 0;

  function specularFor(slice: number, radius: number) {
    const key = `${slice}r${radius}`;
    if (!speculars.has(key)) {
      const canvas = drawSpecular(slice, radius, density);
      speculars.set(key, canvas ? `url("${canvas.toDataURL()}")` : null);
    }
    return speculars.get(key) ?? null;
  }

  function mapsFor(key: string, slice: number, radius: number, bezel: number) {
    if (maps.has(key)) return maps.get(key) ?? null;
    const refraction = drawRefraction(slice, radius, bezel);
    const map = refraction && cut(refraction.canvas, slice);
    const edge = drawEdgeLight(slice, radius, density);
    const value =
      refraction && map
        ? {
            slice,
            scale: refraction.scale,
            map,
            band: edge && cut(edge, slice),
          }
        : null;
    maps.set(key, value);
    return value;
  }

  function pieces(filter: Element, result: string) {
    const nodes = {} as Record<Piece, SVGElement>;
    for (const piece of PIECES) {
      nodes[piece] = set(filter, "feImage", {
        preserveAspectRatio: "none",
        result: `${result}-${piece}`,
      });
    }
    return nodes;
  }

  function merge(filter: Element, result: string, under?: string) {
    const node = set(filter, "feMerge", { result });
    if (under) set(node, "feMergeNode", { in: under });
    for (const piece of PIECES) {
      set(node, "feMergeNode", { in: `${result}-${piece}` });
    }
  }

  function buildLens(
    maps: LensMaps,
    clear: boolean,
    prism: boolean,
    bend: number,
    key: string,
  ): Lens {
    const id = `liquid-lens-${++count}`;
    // Pixel units: inside backdrop-filter, Chromium resolves percentages
    // against a box other than the element, which misaligns the map.
    const filter = set(defs, "filter", {
      id,
      filterUnits: "userSpaceOnUse",
      primitiveUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      "color-interpolation-filters": "sRGB",
    }) as SVGFilterElement;
    // The middle of the map does not bend: neutral grey under the rim.
    const flat = set(filter, "feFlood", {
      "flood-color": "rgb(128 128 128)",
      "flood-opacity": 1,
      x: 0,
      y: 0,
      result: "flat",
    });
    const map = pieces(filter, "map");
    merge(filter, "map", "flat");
    if (clear && !prism) {
      // Clear glass sits over text (a label, a page): split colours would
      // fringe every letter, so all three bend together.
      set(filter, "feDisplacementMap", {
        in: "SourceGraphic",
        in2: "map",
        scale: (maps.scale * bend).toFixed(2),
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "bent",
      });
    } else {
      [1 + DISPERSION, 1, 1 - DISPERSION].forEach((spread, channel) => {
        set(filter, "feDisplacementMap", {
          in: "SourceGraphic",
          in2: "map",
          scale: (maps.scale * bend * spread).toFixed(2),
          xChannelSelector: "R",
          yChannelSelector: "G",
          result: `bent${channel}`,
        });
        set(filter, "feColorMatrix", {
          in: `bent${channel}`,
          type: "matrix",
          values: CHANNEL[channel]!,
          result: `channel${channel}`,
        });
      });
      set(filter, "feBlend", {
        in: "channel0",
        in2: "channel1",
        mode: "screen",
        result: "rg",
      });
      set(filter, "feBlend", {
        in: "rg",
        in2: "channel2",
        mode: "screen",
        result: "bent",
      });
      // The frost, after the bending so the bend stays legible even where
      // the scene behind is smooth. (Blurring first would bend a scene with
      // nothing left in it to bend.) Clear glass has none.
      if (!clear) {
        set(filter, "feGaussianBlur", {
          in: "bent",
          stdDeviation: FROST_BLUR,
          edgeMode: "duplicate",
          result: "frosted",
        });
      }
    }
    // The edge light: the bent scene, softened a touch (clear glass keeps it
    // sharp), kept only in the band at the rim and brightened, laid over the
    // frost.
    let band: Lens["band"] = null;
    let dark: Lens["dark"] = null;
    if (maps.band) {
      // Drawn grey on black (opaque, so the slices' overlaps leave no seam),
      // then the grey made the alpha.
      dark = set(filter, "feFlood", {
        "flood-color": "#000",
        "flood-opacity": 1,
        x: 0,
        y: 0,
        result: "dark",
      });
      band = pieces(filter, "band");
      merge(filter, "band", "dark");
      set(filter, "feColorMatrix", {
        in: "band",
        type: "matrix",
        values: "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0",
        result: "edge",
      });
      if (!clear) {
        set(filter, "feGaussianBlur", {
          in: "bent",
          stdDeviation: EDGE_BLUR,
          edgeMode: "duplicate",
          result: "softened",
        });
      }
      set(filter, "feComposite", {
        in: clear ? "bent" : "softened",
        in2: "edge",
        operator: "in",
        result: "caught",
      });
      const lift = set(filter, "feComponentTransfer", {
        in: "caught",
        result: "glow",
      });
      for (const channel of ["feFuncR", "feFuncG", "feFuncB"]) {
        set(lift, channel, {
          type: "linear",
          slope: clear ? CLEAR_EDGE_GAIN : EDGE_GAIN,
          intercept: EDGE_LIFT,
        });
      }
      set(filter, "feComposite", {
        in: "glow",
        in2: clear ? "bent" : "frosted",
        operator: "over",
      });
    }
    for (const piece of PIECES) {
      map[piece].setAttribute("href", maps.map[piece]);
      if (band && maps.band) band[piece].setAttribute("href", maps.band[piece]);
    }
    return {
      key,
      filter,
      slice: maps.slice,
      map,
      band,
      flat,
      dark,
      width: -1,
      height: -1,
    };
  }

  /** Moves a lens's slices to a new size: attributes only, nothing redrawn. */
  function place(lens: Lens, width: number, height: number) {
    if (lens.width === width && lens.height === height) return;
    lens.width = width;
    lens.height = height;
    lens.filter.setAttribute("width", String(width));
    lens.filter.setAttribute("height", String(height));
    for (const flood of lens.dark ? [lens.flat, lens.dark] : [lens.flat]) {
      flood.setAttribute("width", String(width));
      flood.setAttribute("height", String(height));
    }
    const boxes = layout(lens.slice, width, height);
    for (const piece of PIECES) {
      const [x, y, w, h] = boxes[piece];
      for (const nodes of lens.band ? [lens.map, lens.band] : [lens.map]) {
        const node = nodes[piece];
        node.setAttribute("x", String(x));
        node.setAttribute("y", String(y));
        node.setAttribute("width", String(w));
        node.setAttribute("height", String(h));
      }
    }
  }

  function dropLens(element: HTMLElement) {
    const lens = lenses.get(element);
    if (!lens) return;
    lens.filter.remove();
    lenses.delete(element);
    element.style.removeProperty("--liquid-lens");
  }

  function fit(element: HTMLElement) {
    // Server-rendered markup React has not hydrated yet must stay as sent,
    // or hydration reports a mismatch; try again shortly.
    if (!hydrated(element)) {
      window.clearTimeout(timers.get(element));
      timers.set(
        element,
        window.setTimeout(() => {
          if (element.isConnected) fit(element);
        }, HYDRATION_RETRY_MS),
      );
      return;
    }
    if (element.classList.contains(FLUID)) return;
    const size = sizes.get(element);
    if (!size) return;
    const { width, height } = size;
    if (width < MIN_SIDE || height < MIN_SIDE) return;
    const radius = Math.round(radiusOf(element, width, height) * 2) / 2;

    if (glinting) {
      const slice = Math.max(Math.ceil(radius), GLINT_REACH);
      const key = `${slice}r${radius}`;
      if (glints.get(element) !== key) {
        const specular = specularFor(slice, radius);
        if (specular) {
          glints.set(element, key);
          element.style.setProperty("--liquid-specular", specular);
          element.style.setProperty(
            "--liquid-specular-slice",
            String(Math.round(slice * density)),
          );
          element.style.setProperty("--liquid-specular-width", `${slice}px`);
          element.dataset.liquid = "";
        }
      }
    }

    const clear = element.classList.contains(CLEAR);
    if (!lensing || !(clear || element.classList.contains(LENS))) {
      dropLens(element);
      return;
    }
    // A surface can ask for its own rim (`--liquid-bezel`, px) and its own
    // strength (`--liquid-bend`, × the full lens): a narrow rim bends a thin
    // band, and the strength keeps that band from going faint.
    const style = getComputedStyle(element);
    const asked = parseFloat(style.getPropertyValue("--liquid-bezel"));
    const strength = parseFloat(style.getPropertyValue("--liquid-bend"));
    const bend =
      Number.isFinite(strength) && strength > 0
        ? strength
        : clear
          ? CLEAR_BEND
          : 1;
    const prism = clear && element.classList.contains(PRISM);
    const bezel = Math.round(
      Number.isFinite(asked) && asked > 0
        ? Math.min(asked, Math.min(width, height) / 2)
        : bezelOf(width, height, radius),
    );
    // Deep enough for the bezel and the edge light, but never past the
    // middle of a small surface.
    const slice = Math.max(
      Math.min(
        Math.ceil(Math.max(radius, bezel, EDGE_REACH)),
        Math.floor(Math.min(width, height) / 2),
      ),
      Math.ceil(radius),
    );
    const key = `${slice}r${radius}b${bezel}x${bend}${clear ? "c" : ""}${prism ? "p" : ""}`;
    let lens = lenses.get(element);
    if (lens?.key !== key) {
      const found = mapsFor(key, slice, radius, bezel);
      if (lens) lens.filter.remove();
      if (!found) {
        lenses.delete(element);
        element.style.removeProperty("--liquid-lens");
        return;
      }
      lens = buildLens(found, clear, prism, bend, key);
      lenses.set(element, lens);
      // Tone first (saturation, brightness); the lens bends, frosts and
      // lights the edge itself.
      element.style.setProperty(
        "--liquid-lens",
        `var(--liquid-lens-tone) url(#${lens.filter.id})`,
      );
    }
    place(lens, width, height);
  }

  // Fires after layout and before paint, on every frame a surface resizes:
  // the glint and the lens follow the size in the frame it changes.
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const box = entry.borderBoxSize[0];
      sizes.set(element, {
        width: box ? box.inlineSize : element.offsetWidth,
        height: box ? box.blockSize : element.offsetHeight,
      });
      fit(element);
    }
  });

  const watched = new WeakSet<Element>();
  function observe(element: Element) {
    if (watched.has(element)) return;
    watched.add(element);
    observer.observe(element, { box: "border-box" });
  }
  function watch(root: ParentNode) {
    if (root instanceof Element && root.matches(SELECTOR)) observe(root);
    for (const element of root.querySelectorAll(SELECTOR)) observe(element);
  }
  function release(root: Element) {
    const gone = root.matches(SELECTOR) ? [root] : [];
    gone.push(...root.querySelectorAll(SELECTOR));
    for (const element of gone) {
      if (element.isConnected) continue;
      observer.unobserve(element);
      watched.delete(element);
      const lens = lenses.get(element);
      if (lens) {
        lens.filter.remove();
        lenses.delete(element);
      }
    }
  }

  watch(document);
  const additions = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node instanceof Element) release(node);
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) watch(node);
      }
      const { target } = record;
      if (record.type === "attributes" && target instanceof HTMLElement) {
        if (target.matches(SELECTOR)) {
          observe(target);
          // A class change can turn the lens on or off.
          fit(target);
        }
      }
    }
  });
  additions.observe(document.body, {
    attributeFilter: ["class"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  return () => {
    additions.disconnect();
    observer.disconnect();
    defs.remove();
  };
}

export function LiquidLens(): null {
  useEffect(() => startLiquid(refracts()), []);
  return null;
}
