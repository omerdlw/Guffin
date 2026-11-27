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
  widestBezel,
} from "./materials";
import { channelSpread, rimShift } from "./optics";
import { compactPng, pngDataUrl } from "./png";

const SVG_NS = "http://www.w3.org/2000/svg";
const SELECTOR = ".liquid";
const FLUID = "liquid-fluid";
const MIN_SIDE = 16;
const EDGE_REACH = 12;
const HYDRATION_RETRY_MS = 250;
// After a density change the old filters stay until the new lenses decode.
const RETIRE_MS = 1000;

let count = 0;
const densityNow = () => Math.min(window.devicePixelRatio || 1, 2);

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

const shapeKey = (slice: number, radius: number, bezel: number) =>
  `${slice}r${radius}b${bezel}`;

const CHANNEL = [
  "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
];

type LensMaps = { slice: number; map: Pieces };

type Bend = { node: SVGElement; factor: number };

type Lens = {
  key: string;
  filter: SVGFilterElement;
  slice: number;
  bezel: number;
  shape: string;
  wanted: string;
  bends: Bend[];
  margin: number;
  map: Record<Piece, SVGElement>;
  flat: SVGElement;
  paper: SVGElement | null;
  glint: SVGElement;
  frost: SVGElement | null;
  material: Material;
  width: number;
  height: number;
};

type Reading = {
  width: number;
  height: number;
  radius: number;
  name: MaterialName;
  material: Material;
  bezel: number | null;
  stain: number;
  glint: string;
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
  const named = element.dataset.glint;
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
    glint:
      named && /^[a-z]+$/.test(named)
        ? `--liquid-glint-${named}`
        : "--liquid-glint",
  };
}

const STORE = "guffin:glass-maps";
const STORE_LIMIT = 64;

function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0).toString(36);
}

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
  } catch {}
  return new Map();
}

const compacted = new Map<string, string>();

async function saveMaps(version: string, maps: Map<string, LensMaps>) {
  const kept: Record<string, LensMaps> = {};
  for (const [key, value] of [...maps].slice(-STORE_LIMIT)) {
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
  } catch {}
}

const idle = (task: () => void) => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: 2000 });
  } else setTimeout(task, 200);
};

function startGlass(lensing: boolean, density: number) {
  const defs = document.createElementNS(SVG_NS, "svg");
  defs.setAttribute("aria-hidden", "true");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.style.position = "absolute";
  defs.style.pointerEvents = "none";
  document.body.append(defs);

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
  const pending = new Map<Element, Lens>();
  const sizes = new WeakMap<Element, { width: number; height: number }>();
  const timers = new Map<Element, number>();

  const edges = new Map<string, ReturnType<typeof drawEdgeLight>>();
  function mapsFor(slice: number, radius: number, bezel: number) {
    const key = `${slice}r${radius}b${bezel}`;
    const known = maps.get(key);
    if (known) {
      maps.delete(key);
      maps.set(key, known);
      return known;
    }
    const shape = `${slice}r${radius}`;
    let edge = edges.get(shape);
    if (!edge) {
      edge = drawEdgeLight(slice, radius, density);
      edges.set(shape, edge);
    }
    const refraction = drawRefraction(slice, radius, bezel, density);
    const value = { slice, map: fold(refraction, edge, slice) };
    maps.set(key, value);
    remember();
    return value;
  }

  // A new feImage href paints nothing until its image is decoded, so a lens
  // only takes new maps once all nine pieces are ready; the old ones stay
  // on screen meanwhile.
  const decoded = new Map<string, HTMLImageElement>();
  function whenReady(map: Pieces, then: () => void) {
    const missing = PIECES.map((piece) => map[piece]).filter(
      (url) => !decoded.has(url),
    );
    if (!missing.length) return then();
    void Promise.all(
      missing.map((url) => {
        const image = new Image();
        image.src = url;
        return image.decode().then(
          () => void decoded.set(url, image),
          () => void decoded.set(url, image),
        );
      }),
    ).then(then);
  }

  function buildLens(
    found: LensMaps,
    material: Material,
    radius: number,
    bezel: number,
    stain: number,
    glintToken: string,
    key: string,
  ): Lens {
    const id = `liquid-lens-${++count}`;
    const clear = material.frost.large === 0;
    const margin = Math.max(Math.ceil(material.frost.large * 3), 4);
    const filter = set(defs, "filter", {
      id,
      filterUnits: "userSpaceOnUse",
      primitiveUnits: "userSpaceOnUse",
      x: -margin,
      y: -margin,
      "color-interpolation-filters": "sRGB",
    }) as SVGFilterElement;
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

    const scale = 2 * material.reach * bezel * material.bend;
    const bends: Bend[] = [];
    if (material.abbe > 0) {
      const spread = channelSpread(material.ior, material.abbe);
      spread.forEach((factor, channel) => {
        const node = set(filter, "feDisplacementMap", {
          in: "SourceGraphic",
          in2: "map",
          scale: (scale * factor).toFixed(2),
          xChannelSelector: "R",
          yChannelSelector: "G",
          result: `bent${channel}`,
        });
        bends.push({ node, factor });
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
      const node = set(filter, "feDisplacementMap", {
        in: "SourceGraphic",
        in2: "map",
        scale: scale.toFixed(2),
        xChannelSelector: "R",
        yChannelSelector: "G",
        result: "bent",
      });
      bends.push({ node, factor: 1 });
    }
    const frost = clear
      ? null
      : set(filter, "feGaussianBlur", {
          in: "bent",
          stdDeviation: material.frost.large,
          edgeMode: "duplicate",
          result: "frosted",
        });
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
    const glint = set(filter, "feFlood", {
      x: -margin,
      y: -margin,
      result: "glint-light",
    });
    glint.setAttribute("style", `flood-color: var(${glintToken})`);
    set(filter, "feComposite", {
      in: "glint-light",
      in2: "edge",
      operator: "in",
      result: "glint",
    });
    set(filter, "feBlend", {
      in: "glint",
      in2: "glass",
      mode: "screen",
      result: "lit",
    });
    let paper: SVGElement | null = null;
    if (stain > 0 && !clear) {
      paper = set(filter, "feFlood", {
        x: -margin,
        y: -margin,
        result: "paper",
      });
      paper.setAttribute("style", "flood-color: var(--page)");
      set(filter, "feBlend", {
        in: "paper",
        in2: "lit",
        mode: "color",
        result: "stained",
      });
      set(filter, "feComposite", {
        in: "stained",
        in2: "lit",
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
      bezel,
      shape: shapeKey(found.slice, radius, bezel),
      wanted: shapeKey(found.slice, radius, bezel),
      bends,
      margin,
      map,
      flat,
      paper,
      glint,
      frost,
      material,
      width: -1,
      height: -1,
    };
  }

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
    lens.glint.setAttribute("width", outer[0]!);
    lens.glint.setAttribute("height", outer[1]!);
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

  // Same lens, new shape (rim width, corner radius, slice): swap the maps,
  // the displacement and the piece boxes in place, so a card that resizes
  // keeps one filter. A new filter on a live element repaints its
  // backdrop from scratch, which flickers when it happens every frame (a
  // pill whose radius follows its animated height, a card shorter than its
  // widest rim).
  function reshape(lens: Lens, slice: number, radius: number, bezel: number) {
    const shape = shapeKey(slice, radius, bezel);
    if (lens.wanted === shape) return;
    lens.wanted = shape;
    const found = mapsFor(slice, radius, bezel);
    whenReady(found.map, () => {
      if (lens.wanted !== shape || lens.shape === shape) return;
      lens.shape = shape;
      for (const piece of PIECES) {
        lens.map[piece].setAttribute("href", found.map[piece]);
      }
      if (lens.bezel !== bezel) {
        lens.bezel = bezel;
        const scale = 2 * lens.material.reach * bezel * lens.material.bend;
        for (const { node, factor } of lens.bends) {
          node.setAttribute("scale", (scale * factor).toFixed(2));
        }
      }
      if (lens.slice !== slice) {
        lens.slice = slice;
        const { width, height } = lens;
        lens.width = -1;
        place(lens, width, height);
      }
    });
  }

  function forget(element: Element) {
    const waiting = pending.get(element);
    if (waiting) {
      waiting.filter.remove();
      pending.delete(element);
    }
    const lens = lenses.get(element);
    if (lens) {
      lens.filter.remove();
      lenses.delete(element);
    }
  }

  function dropLens(element: HTMLElement) {
    if (!lenses.has(element) && !pending.has(element)) return;
    forget(element);
    element.style.removeProperty("--liquid-lens");
  }

  function read(element: HTMLElement): Reading | "drop" | "skip" {
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
    const { width, height, radius, name, material, stain, glint } = reading;
    const asked = reading.bezel;
    const short = Math.min(width, height);
    const bezel = Math.round(
      asked ? Math.min(asked, short / 2) : bezelFor(material, width, height),
    );
    // The slice fits the widest rim this element can grow to, so a resize
    // only reshapes the lens in place, never swaps the filter.
    const slice = Math.max(
      Math.min(
        Math.ceil(Math.max(radius, asked ?? widestBezel(material), EDGE_REACH)),
        Math.floor(short / 2),
      ),
      Math.ceil(radius),
    );
    const key = `${name}:x${material.bend}s${stain}${glint}`;
    const live = lenses.get(element);
    if (live?.key === key) {
      pending.get(element)?.filter.remove();
      pending.delete(element);
      place(live, width, height);
      reshape(live, slice, radius, bezel);
      return;
    }
    if (live) place(live, width, height);
    const waiting = pending.get(element);
    if (waiting?.key === key) {
      place(waiting, width, height);
      reshape(waiting, slice, radius, bezel);
      return;
    }
    waiting?.filter.remove();
    const found = mapsFor(slice, radius, bezel);
    const next = buildLens(found, material, radius, bezel, stain, glint, key);
    pending.set(element, next);
    place(next, width, height);
    whenReady(found.map, () => {
      if (pending.get(element) !== next) return;
      pending.delete(element);
      lenses.get(element)?.filter.remove();
      lenses.set(element, next);
      element.style.setProperty(
        "--liquid-lens",
        material.frost.large === 0
          ? `url(#${next.filter.id})`
          : `var(--liquid-lens-tone) url(#${next.filter.id})`,
      );
    });
  }

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
      forget(element);
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
          changed.add(target);
        }
      }
    }
    for (const element of changed) refit(element);
  });
  additions.observe(document.body, {
    attributeFilter: ["class", "data-glass", "data-glint", "data-placement"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  return (linger = 0) => {
    additions.disconnect();
    observer.disconnect();
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    if (linger) window.setTimeout(() => defs.remove(), linger);
    else defs.remove();
  };
}

// Maps are drawn per device pixel. Windows windows often move between a 150%
// laptop panel and a 100% monitor, so redraw them when the density changes.
export function GlassEngine(): null {
  useEffect(() => {
    const lensing = refracts();
    let density = densityNow();
    let stop = startGlass(lensing, density);
    let query: MediaQueryList | undefined;
    // The resolution query is the signal; resize also fires on a monitor move.
    function check() {
      query?.removeEventListener("change", check);
      query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      query.addEventListener("change", check);
      const next = densityNow();
      if (next === density) return;
      density = next;
      const retire = stop;
      stop = startGlass(lensing, density);
      retire(RETIRE_MS);
    }
    check();
    window.addEventListener("resize", check);
    return () => {
      query?.removeEventListener("change", check);
      window.removeEventListener("resize", check);
      stop();
    };
  }, []);
  return null;
}
