// Where the cursor's glass should lie on a target, and with what corners.
//
// The element that owns a pointer (a link, a button) is often not the thing
// you see: a link wrapping a round avatar is a square box with no corners, so
// fitting the glass to it drew a square round a circle. The shape is read
// from what is painted instead: the target itself when it has a surface or
// corners of its own, otherwise the one child that fills it (an avatar, a
// poster, a pill), a few levels down at most.

export interface ShapeBox {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface ShapeProbe<T> {
  children(node: T): readonly T[];
  /** A surface of its own: a fill, a ring, a border or a picture. */
  painted(node: T): boolean;
  /** The computed `border-top-left-radius`. */
  radius(node: T): string;
  rect(node: T): ShapeBox;
}

export interface Shape<T> {
  box: ShapeBox;
  node: T;
  radius: number;
}

/** A child stands for its parent when it covers this share of it (or more). */
const FILLS = 0.85;
/** …and is not much larger than it (an overlay hanging outside). */
const OVERFLOWS = 1.2;
const DEPTH = 3;

const area = (box: ShapeBox) =>
  Math.max(box.right - box.left, 0) * Math.max(box.bottom - box.top, 0);

/**
 * A computed corner in px: lengths, percentages of the box, the first of an
 * elliptical pair; capped at half the short side (a pill or a circle).
 */
export function radiusPx(value: string, width: number, height: number) {
  const first = value.trim().split(/\s+/)[0] ?? "";
  const n = Number.parseFloat(first);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const px = first.endsWith("%") ? (n / 100) * Math.min(width, height) : n;
  return Math.min(px, Math.max(Math.min(width, height), 0) / 2);
}

export function findShape<T>(target: T, probe: ShapeProbe<T>): Shape<T> {
  let node = target;
  for (let depth = 0; depth <= DEPTH; depth++) {
    const box = probe.rect(node);
    const width = box.right - box.left;
    const height = box.bottom - box.top;
    const radius = radiusPx(probe.radius(node), width, height);
    if (radius > 0 || probe.painted(node) || depth === DEPTH) {
      return { box, node, radius };
    }
    const own = area(box);
    let best: T | null = null;
    let bestArea = 0;
    for (const child of probe.children(node)) {
      const size = area(probe.rect(child));
      if (size > bestArea) {
        best = child;
        bestArea = size;
      }
    }
    const stands =
      best !== null &&
      own > 0 &&
      bestArea >= own * FILLS &&
      bestArea <= own * OVERFLOWS;
    if (!stands) return { box, node, radius };
    node = best!;
  }
  const box = probe.rect(node);
  return { box, node, radius: 0 };
}

const PICTURES = new Set(["CANVAS", "IMG", "PICTURE", "SVG", "VIDEO"]);

const clear = (colour: string) =>
  colour === "transparent" || /rgba?\(.*,\s*0\)$|\/\s*0\)$/.test(colour);

export const DOM_PROBE: ShapeProbe<Element> = {
  children: (node) => Array.from(node.children),
  painted: (node) => {
    if (PICTURES.has(node.tagName.toUpperCase())) return true;
    const style = getComputedStyle(node);
    return (
      !clear(style.backgroundColor) ||
      style.backgroundImage !== "none" ||
      style.boxShadow !== "none" ||
      Number.parseFloat(style.borderTopWidth) > 0
    );
  },
  radius: (node) => getComputedStyle(node).borderTopLeftRadius,
  rect: (node) => node.getBoundingClientRect(),
};

/** How long a target's shape is trusted before it is read again (ms). */
const SHAPE_MEMORY_MS = 600;
const known = new WeakMap<
  Element,
  { at: number; node: Element; radius: number }
>();

/**
 * The element whose box the glass takes and its corner, for a target. An
 * author can name it: `data-cursor-shape` holds a selector inside the target.
 */
export function shapeOf(target: HTMLElement, now = performance.now()) {
  const memo = known.get(target);
  if (memo && now - memo.at < SHAPE_MEMORY_MS && memo.node.isConnected) {
    return memo;
  }
  const named = target.dataset.cursorShape
    ? target.querySelector(target.dataset.cursorShape)
    : null;
  const shape = named
    ? findShape<Element>(named, { ...DOM_PROBE, painted: () => true })
    : findShape<Element>(target, DOM_PROBE);
  const next = { at: now, node: shape.node, radius: shape.radius };
  known.set(target, next);
  return next;
}
