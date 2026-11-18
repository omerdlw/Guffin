"use client";

import { useEffect } from "react";
import {
  drawEdgeLight,
  drawRefraction,
  fold,
  layout,
  PIECES,
  type Piece,
  type Pieces,
} from "./maps";
import { compactPng, pngDataUrl } from "./png";
import {
  bezelFor,
  frostFor,
  type Material,
  MATERIALS,
  type MaterialName,
  materialOf,
} from "./materials";
import { channelSpread, rimShift } from "./optics";

// The glass engine. Every `.liquid` surface is a slab of glass made of a
// material (materials.ts); on `liquid-lens` surfaces in Chromium (the only
// engine that runs SVG filters inside backdrop-filter) the engine fits it
// with a lens drawn from the optics (optics.ts, maps.ts) and keeps it fitted
// as it resizes: the scene behind refracts through the rim, each colour
// channel by its own index, then frosts, then the light caught in the bezel
// glows back out of it in the scene's own colours. One SVG filter per
// surface, its slices moved (never redrawn) as it resizes. Elsewhere the
// surface keeps its CSS frost.

const SVG_NS = "http://www.w3.org/2000/svg";
const SELECTOR = ".liquid";
/**
 * A surface that morphs every frame (the cursor's pane): its corners change
 * with its size, so it keeps the size-free CSS rim instead.
 */
const FLUID = "liquid-fluid";
const MIN_SIDE = 16;
/** The edge light fades out over this many px at least. */
const EDGE_REACH = 12;
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

type LensMaps = { slice: number; map: Pieces };

/** One surface's own lens: a filter whose slices follow its size. */
type Lens = {
  key: string;
  filter: SVGFilterElement;
  slice: number;
  margin: number;
  map: Record<Piece, SVGElement>;
  flat: SVGElement;
  /** The page's colour the glass is stained with, sized like `flat`. */
  paper: SVGElement | null;
  /** The frost, set to the surface's size as it resizes. */
  frost: SVGElement | null;
  material: Material;
  width: number;
  height: number;
};

/**
 * What a surface's lens is fitted from, read in one pass over its computed
 * style: its corner, its material and that surface's own overrides.
 */
type Reading = {
  width: number;
  height: number;
  radius: number;
  name: MaterialName;
  material: Material;
  bezel: number | null;
  /** How far the glass takes the page's colour (0–1), `--liquid-stain`. */
  stain: number;
};

function readSurface(
  element: HTMLElement,
  name: MaterialName,
  width: number,
  height: number,
): Reading {
  const base = MATERIALS[name];
  const style = getComputedStyle(element);
  const corner = parseFloat(style.borderTopLeftRadius);
  const bend = parseFloat(style.getPropertyValue("--liquid-bend"));
  const bezel = parseFloat(style.getPropertyValue("--liquid-bezel"));
  const stain = parseFloat(style.getPropertyValue("--liquid-stain"));
  return {
    width,
    height,
    radius:
      Math.round(
        Math.min(Number.isFinite(corner) ? corner : 0, width / 2, height / 2) *
          2,
      ) / 2,
    name,
    material:
      Number.isFinite(bend) && bend > 0
        ? { ...base, bend }
        : (base as Material),
    bezel: Number.isFinite(bezel) && bezel > 0 ? bezel : null,
    stain:
      Number.isFinite(stain) && stain > 0
        ? Math.round(Math.min(stain, 1) * 100) / 100
        : 0,
  };
}

/**
 * Drawn maps outlive the page: kept in storage under a key that changes
 * whenever the drawing code does (its own source, hashed), so a reload or a
 * new tab lays out lenses without drawing any.
 */
const STORE = "guffin:glass-maps";
const STORE_LIMIT = 64;

function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * The drawing code's fingerprint: its sources, and one small map drawn
 * through all of it (helpers a source does not show still change the map).
 */
function mapsVersion(density: number) {
  const probe = fold(
    drawRefraction(12, 8, 6, density),
    drawEdgeLight(12, 8, density),
    12,
  );
  return hash(
    [drawRefraction, drawEdgeLight, fold, pngDataUrl, rimShift]
      .join("\n")
      .concat(...PIECES.map((piece) => probe[piece])),
  );
}

type Stored = { version: string; maps: Record<string, LensMaps> };

function loadMaps(version: string): Map<string, LensMaps> {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORE) ?? "null",
    ) as Stored | null;
    if (stored?.version === version && stored.maps) {
      for (const { map } of Object.values(stored.maps)) {
        for (const piece of PIECES) compacted.set(map[piece], map[piece]);
      }
      return new Map(Object.entries(stored.maps));
    }
  } catch {
    // Storage blocked or the entry unreadable: draw afresh.
  }
  return new Map();
}

/** Each drawn piece, deflated for storage (pixels untouched). */
const compacted = new Map<string, string>();

async function saveMaps(version: string, maps: Map<string, LensMaps>) {
  const kept: Record<string, LensMaps> = {};
  let count = 0;
  for (const [key, value] of maps) {
    if (++count > STORE_LIMIT) break;
    const map = {} as Pieces;
    for (const piece of PIECES) {
      const url = value.map[piece];
      let small = compacted.get(url);
      if (!small) {
        small = await compactPng(url);
        compacted.set(url, small);
      }
      map[piece] = small;
    }
    kept[key] = { slice: value.slice, map };
  }
  try {
    localStorage.setItem(
      STORE,
      JSON.stringify({ version, maps: kept } satisfies Stored),
    );
  } catch {
    // Full or blocked: the maps are drawn again next time.
  }
}

const idle = (task: () => void) => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: 2000 });
  } else setTimeout(task, 200);
};

function startGlass(lensing: boolean) {
  const defs = document.createElementNS(SVG_NS, "svg");
  defs.setAttribute("aria-hidden", "true");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.style.position = "absolute";
  defs.style.pointerEvents = "none";
  document.body.append(defs);

  const density = Math.min(window.devicePixelRatio || 1, 2);
  const version = lensing ? `${mapsVersion(density)}@${density}` : "";
  const maps = lensing ? loadMaps(version) : new Map<string, LensMaps>();
  let saving = false;
  function remember() {
    if (saving) return;
    saving = true;
    idle(() => {
      saving = false;
      void saveMaps(version, maps);
    });
  }
  const lenses = new Map<Element, Lens>();
  const sizes = new WeakMap<Element, { width: number; height: number }>();
  // Pending hydration retries, cancelled with the rest on teardown.
  const timers = new Map<Element, number>();
  let count = 0;

  function mapsFor(key: string, slice: number, radius: number, bezel: number) {
    const known = maps.get(key);
    if (known) return known;
    const refraction = drawRefraction(slice, radius, bezel, density);
    const edge = drawEdgeLight(slice, radius, density);
    const value = { slice, map: fold(refraction, edge, slice) };
    maps.set(key, value);
    remember();
    return value;
  }

  function buildLens(
    found: LensMaps,
    material: Material,
    bezel: number,
    stain: number,
    key: string,
  ): Lens {
    const id = `liquid-lens-${++count}`;
    const clear = material.frost.large === 0;
    // The filter reads the scene this far past the edge: the frost's reach
    // (3σ). Cut at the edge, the blur would fade to transparent within that
    // reach and the sharp scene would show round the rim. The browser still
    // clips to the surface.
    const margin = Math.max(Math.ceil(material.frost.large * 3), 4);
    // Pixel units: inside backdrop-filter, Chromium resolves percentages
    // against a box other than the element, which misaligns the map.
    const filter = set(defs, "filter", {
      id,
      filterUnits: "userSpaceOnUse",
      primitiveUnits: "userSpaceOnUse",
      x: -margin,
      y: -margin,
      "color-interpolation-filters": "sRGB",
    }) as SVGFilterElement;
    // The middle of the map does not bend (neutral red and green) and
    // carries no edge light (no blue).
    const flat = set(filter, "feFlood", {
      "flood-color": "rgb(128 128 0)",
      "flood-opacity": 1,
      x: -margin,
      y: -margin,
      result: "flat",
    });
    const map = {} as Record<Piece, SVGElement>;
    for (const piece of PIECES) {
      map[piece] = set(filter, "feImage", {
        preserveAspectRatio: "none",
        result: `map-${piece}`,
      });
      map[piece].setAttribute("href", found.map[piece]);
    }
    const merged = set(filter, "feMerge", { result: "map" });
    set(merged, "feMergeNode", { in: "flat" });
    for (const piece of PIECES) {
      set(merged, "feMergeNode", { in: `map-${piece}` });
    }

    // The full pull at the outline (px); the map holds its share per pixel
    // and feDisplacementMap moves by scale × (value − ½).
    const scale = 2 * material.reach * bezel * material.bend;
    if (material.abbe > 0) {
      // Each channel through its own index (the Abbe number), recombined.
      const spread = channelSpread(material.ior, material.abbe);
      spread.forEach((factor, channel) => {
        set(filter, "feDisplacementMap", {
          in: "SourceGraphic",
          in2: "map",
          scale: (scale * factor).toFixed(2),
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
    } else {
      set(filter, "feDisplacementMap", {
        in: "SourceGraphic",
        in2: "map",
        scale: scale.toFixed(2),
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "bent",
      });
    }
    // The frost, after the bending so the bend stays legible even where the
    // scene behind is smooth (blurring first would bend a scene with nothing
    // left in it to bend).
    // Its depth follows the surface's size (`place`).
    const frost = clear
      ? null
      : set(filter, "feGaussianBlur", {
          in: "bent",
          stdDeviation: material.frost.large,
          edgeMode: "duplicate",
          result: "frosted",
        });
    // The edge light: the bent scene, softened a touch, kept only in the
    // band at the rim, richer and brightened, laid over the frost.
    set(filter, "feColorMatrix", {
      in: "map",
      type: "matrix",
      values: "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 0",
      result: "edge",
    });
    if (material.edge.blur > 0) {
      set(filter, "feGaussianBlur", {
        in: "bent",
        stdDeviation: material.edge.blur,
        edgeMode: "duplicate",
        result: "softened",
      });
    }
    set(filter, "feComposite", {
      in: material.edge.blur > 0 ? "softened" : "bent",
      in2: "edge",
      operator: "in",
      result: "caught",
    });
    set(filter, "feColorMatrix", {
      in: "caught",
      type: "saturate",
      values: 1.35,
      result: "rich",
    });
    const lift = set(filter, "feComponentTransfer", {
      in: "rich",
      result: "glow",
    });
    for (const channel of ["feFuncR", "feFuncG", "feFuncB"]) {
      set(lift, channel, {
        type: "linear",
        slope: material.edge.gain,
        intercept: 0.02,
      });
    }
    set(filter, "feComposite", {
      in: "glow",
      in2: clear ? "bent" : "frosted",
      operator: "over",
      result: "glass",
    });
    // The stain: the glass takes the page's hue and chroma ("color" blend)
    // and keeps its own lightness, so every bend, the frost and the edge
    // light stay while the slab reads as the page's colour. A tint laid on
    // top would get there only by covering them. Partial: what lies behind
    // keeps a share of its own colour.
    let paper: SVGElement | null = null;
    // Clear glass (a drop of water) stays clear.
    if (stain > 0 && !clear) {
      paper = set(filter, "feFlood", {
        x: -margin,
        y: -margin,
        result: "paper",
      });
      paper.setAttribute("style", "flood-color: var(--page)");
      set(filter, "feBlend", {
        in: "paper",
        in2: "glass",
        mode: "color",
        result: "stained",
      });
      set(filter, "feComposite", {
        in: "stained",
        in2: "glass",
        operator: "arithmetic",
        k1: 0,
        k2: stain,
        k3: 1 - stain,
        k4: 0,
      });
    }
    return {
      key,
      filter,
      slice: found.slice,
      margin,
      map,
      flat,
      paper,
      frost,
      material,
      width: -1,
      height: -1,
    };
  }

  /** Moves a lens's slices to a new size: attributes only, nothing redrawn. */
  function place(lens: Lens, width: number, height: number) {
    if (lens.width === width && lens.height === height) return;
    lens.width = width;
    lens.height = height;
    const outer = [
      String(width + lens.margin * 2),
      String(height + lens.margin * 2),
    ];
    lens.filter.setAttribute("width", outer[0]!);
    lens.filter.setAttribute("height", outer[1]!);
    lens.flat.setAttribute("width", outer[0]!);
    lens.flat.setAttribute("height", outer[1]!);
    lens.paper?.setAttribute("width", outer[0]!);
    lens.paper?.setAttribute("height", outer[1]!);
    if (lens.frost) {
      const deviation = String(frostFor(lens.material, width, height));
      if (lens.frost.getAttribute("stdDeviation") !== deviation) {
        lens.frost.setAttribute("stdDeviation", deviation);
      }
    }
    const boxes = layout(lens.slice, width, height);
    for (const piece of PIECES) {
      const [x, y, w, h] = boxes[piece];
      const node = lens.map[piece];
      node.setAttribute("x", String(x));
      node.setAttribute("y", String(y));
      node.setAttribute("width", String(w));
      node.setAttribute("height", String(h));
    }
  }

  function dropLens(element: HTMLElement) {
    const lens = lenses.get(element);
    if (!lens) return;
    lens.filter.remove();
    lenses.delete(element);
    element.style.removeProperty("--liquid-lens");
  }

  /**
   * Reads what a surface's lens needs, or why it has none: no DOM writes, so
   * every surface in a batch is read against one style and layout pass.
   */
  function read(element: HTMLElement): Reading | "drop" | "skip" {
    // Server-rendered markup React has not hydrated yet must stay as sent,
    // or hydration reports a mismatch; try again shortly.
    if (!hydrated(element)) {
      window.clearTimeout(timers.get(element));
      timers.set(
        element,
        window.setTimeout(() => {
          timers.delete(element);
          if (element.isConnected) refit(element);
        }, HYDRATION_RETRY_MS),
      );
      return "skip";
    }
    if (element.classList.contains(FLUID)) return "skip";
    const size = sizes.get(element);
    if (!size) return "skip";
    const { width, height } = size;
    if (width < MIN_SIDE || height < MIN_SIDE) return "skip";
    const name = materialOf(element);
    if (!lensing || !name) return "drop";
    return readSurface(element, name, width, height);
  }

  function apply(element: HTMLElement, reading: Reading) {
    const { width, height, radius, name, material, stain } = reading;
    const asked = reading.bezel;
    const bezel = Math.round(
      asked
        ? Math.min(asked, Math.min(width, height) / 2)
        : bezelFor(material, width, height),
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
    const key = `${name}:${slice}r${radius}b${bezel}x${material.bend}s${stain}`;
    let lens = lenses.get(element);
    if (lens?.key !== key) {
      const found = mapsFor(
        `${slice}r${radius}b${bezel}`,
        slice,
        radius,
        bezel,
      );
      if (lens) lens.filter.remove();
      lens = buildLens(found, material, bezel, stain, key);
      lenses.set(element, lens);
      // Tone first (saturation, brightness); the lens bends, frosts and
      // lights the edge itself. Clear glass takes no tone: it lies over
      // text, and the lifted levels would wash the ink under it to grey.
      element.style.setProperty(
        "--liquid-lens",
        material.frost.large === 0
          ? `url(#${lens.filter.id})`
          : `var(--liquid-lens-tone) url(#${lens.filter.id})`,
      );
    }
    place(lens, width, height);
  }

  /** Fits a batch of surfaces: every read first, then every write. */
  function fit(elements: Iterable<HTMLElement>) {
    const readings: [HTMLElement, Reading | "drop"][] = [];
    for (const element of elements) {
      const reading = read(element);
      if (reading !== "skip") readings.push([element, reading]);
    }
    for (const [element, reading] of readings) {
      if (reading === "drop") dropLens(element);
      else apply(element, reading);
    }
  }

  // Fires after layout and before paint, on every frame a surface resizes:
  // the lens follows the size in the frame it changes.
  const observer = new ResizeObserver((entries) => {
    const resized: HTMLElement[] = [];
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const box = entry.borderBoxSize[0];
      sizes.set(element, {
        width: box ? box.inlineSize : element.offsetWidth,
        height: box ? box.blockSize : element.offsetHeight,
      });
      resized.push(element);
    }
    fit(resized);
  });

  /**
   * Fits a surface again in the coming frame, after its layout and before
   * its paint: observed anew, the ResizeObserver reports it there, where its
   * style is read for free instead of forced mid-task.
   */
  function refit(element: Element) {
    if (!watched.has(element)) return;
    observer.unobserve(element);
    observer.observe(element, { box: "border-box" });
  }

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
    const changed = new Set<Element>();
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
          // A class or material change can turn the lens on or off.
          changed.add(target);
        }
      }
    }
    for (const element of changed) refit(element);
  });
  additions.observe(document.body, {
    // What can change a surface's glass without resizing it: its classes,
    // its material, and the attributes the dock's styles key a card's rim
    // on (a card turning into a shelf keeps its size).
    attributeFilter: ["class", "data-glass", "data-shelf", "data-placement"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  return () => {
    additions.disconnect();
    observer.disconnect();
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    defs.remove();
  };
}

/** Mounted once (providers.tsx). */
export function GlassEngine(): null {
  useEffect(() => startGlass(refracts()), []);
  return null;
}
