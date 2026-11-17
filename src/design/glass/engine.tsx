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
import {
  bezelFor,
  frostFor,
  type Material,
  MATERIALS,
  type MaterialName,
  materialOf,
} from "./materials";
import { channelSpread } from "./optics";

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

type LensMaps = { slice: number; map: Pieces };

/** One surface's own lens: a filter whose slices follow its size. */
type Lens = {
  key: string;
  filter: SVGFilterElement;
  slice: number;
  margin: number;
  map: Record<Piece, SVGElement>;
  flat: SVGElement;
  /** The frost, set to the surface's size as it resizes. */
  frost: SVGElement | null;
  material: Material;
  width: number;
  height: number;
};

/** The material's numbers, with a surface's own overrides read in. */
function tuned(element: HTMLElement, name: MaterialName) {
  const base = MATERIALS[name];
  const style = getComputedStyle(element);
  const bend = parseFloat(style.getPropertyValue("--liquid-bend"));
  const bezel = parseFloat(style.getPropertyValue("--liquid-bezel"));
  return {
    material:
      Number.isFinite(bend) && bend > 0
        ? { ...base, bend }
        : (base as Material),
    bezel: Number.isFinite(bezel) && bezel > 0 ? bezel : null,
  };
}

function startGlass(lensing: boolean) {
  const defs = document.createElementNS(SVG_NS, "svg");
  defs.setAttribute("aria-hidden", "true");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.style.position = "absolute";
  defs.style.pointerEvents = "none";
  document.body.append(defs);

  const density = Math.min(window.devicePixelRatio || 1, 2);
  const maps = new Map<string, LensMaps | null>();
  const lenses = new Map<Element, Lens>();
  const sizes = new WeakMap<Element, { width: number; height: number }>();
  // Pending hydration retries, cancelled with the rest on teardown.
  const timers = new Map<Element, number>();
  let count = 0;

  function mapsFor(key: string, slice: number, radius: number, bezel: number) {
    if (maps.has(key)) return maps.get(key) ?? null;
    const refraction = drawRefraction(slice, radius, bezel, density);
    const edge = drawEdgeLight(slice, radius, density);
    const map = refraction && fold(refraction, edge, slice);
    const value = map ? { slice, map } : null;
    maps.set(key, value);
    return value;
  }

  function buildLens(
    found: LensMaps,
    material: Material,
    bezel: number,
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
    });
    return {
      key,
      filter,
      slice: found.slice,
      margin,
      map,
      flat,
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

  function fit(element: HTMLElement) {
    // Server-rendered markup React has not hydrated yet must stay as sent,
    // or hydration reports a mismatch; try again shortly.
    if (!hydrated(element)) {
      window.clearTimeout(timers.get(element));
      timers.set(
        element,
        window.setTimeout(() => {
          timers.delete(element);
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

    const name = materialOf(element);
    if (!lensing || !name) {
      dropLens(element);
      return;
    }
    const { material, bezel: asked } = tuned(element, name);
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
    const key = `${name}:${slice}r${radius}b${bezel}x${material.bend}`;
    let lens = lenses.get(element);
    if (lens?.key !== key) {
      const found = mapsFor(
        `${slice}r${radius}b${bezel}`,
        slice,
        radius,
        bezel,
      );
      if (lens) lens.filter.remove();
      if (!found) {
        lenses.delete(element);
        element.style.removeProperty("--liquid-lens");
        return;
      }
      lens = buildLens(found, material, bezel, key);
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
  // the lens follows the size in the frame it changes.
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
          // A class or material change can turn the lens on or off.
          fit(target);
        }
      }
    }
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
