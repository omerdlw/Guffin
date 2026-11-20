interface ShapeBox {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface ShapeProbe<T> {
  children(node: T): readonly T[];
  painted(node: T): boolean;
  radius(node: T): string;
  rect(node: T): ShapeBox;
}

interface Shape<T> {
  box: ShapeBox;
  node: T;
  radius: number;
}

const FILLS = 0.85;
const OVERFLOWS = 1.2;
const DEPTH = 3;

const area = (box: ShapeBox) =>
  Math.max(box.right - box.left, 0) * Math.max(box.bottom - box.top, 0);

function radiusPx(value: string, width: number, height: number) {
  const first = value.trim().split(/\s+/)[0] ?? "";
  const n = Number.parseFloat(first);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const px = first.endsWith("%") ? (n / 100) * Math.min(width, height) : n;
  return Math.min(px, Math.max(Math.min(width, height), 0) / 2);
}

function findShape<T>(target: T, probe: ShapeProbe<T>): Shape<T> {
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

const DOM_PROBE: ShapeProbe<Element> = {
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

const SHAPE_MEMORY_MS = 600;
const known = new WeakMap<
  Element,
  { at: number; node: Element; radius: number }
>();

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
