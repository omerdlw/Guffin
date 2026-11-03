import { HAZE_CAP } from "./ladder";

// What a part looks like this frame. Every force (arriving, leaving, depth,
// drift) adds a shade; shades blend into one look and are written once.

export interface Look {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  blur: number;
  brightness: number;
  saturate: number;
  // How much of each side is cut away, 0…1. Cuts from different forces add
  // up as the larger of the two.
  clipTop: number;
  clipRight: number;
  clipBottom: number;
  clipLeft: number;
}

export type Shade = Partial<Look>;

export interface Css {
  opacity: string;
  transform: string;
  filter: string;
  clipPath: string;
}

export const neutral = (): Look => ({
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  blur: 0,
  brightness: 1,
  saturate: 1,
  clipTop: 0,
  clipRight: 0,
  clipBottom: 0,
  clipLeft: 0,
});

export function blend(into: Look, shade: Shade): Look {
  if (shade.opacity !== undefined) into.opacity *= shade.opacity;
  if (shade.x !== undefined) into.x += shade.x;
  if (shade.y !== undefined) into.y += shade.y;
  if (shade.scale !== undefined) into.scale *= shade.scale;
  if (shade.rotate !== undefined) into.rotate += shade.rotate;
  if (shade.blur !== undefined) into.blur += shade.blur;
  if (shade.brightness !== undefined) into.brightness *= shade.brightness;
  if (shade.saturate !== undefined) into.saturate *= shade.saturate;
  if (shade.clipTop !== undefined)
    into.clipTop = Math.max(into.clipTop, shade.clipTop);
  if (shade.clipRight !== undefined)
    into.clipRight = Math.max(into.clipRight, shade.clipRight);
  if (shade.clipBottom !== undefined)
    into.clipBottom = Math.max(into.clipBottom, shade.clipBottom);
  if (shade.clipLeft !== undefined)
    into.clipLeft = Math.max(into.clipLeft, shade.clipLeft);
  return into;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

export function css(look: Look): Css {
  const transform: string[] = [];
  if (round(look.x) !== 0 || round(look.y) !== 0)
    transform.push(`translate3d(${round(look.x)}px, ${round(look.y)}px, 0)`);
  if (round(look.scale) !== 1) transform.push(`scale(${round(look.scale)})`);
  if (round(look.rotate) !== 0)
    transform.push(`rotate(${round(look.rotate)}deg)`);

  const filter: string[] = [];
  const blur = Math.min(look.blur, HAZE_CAP);
  if (blur > 0.05) filter.push(`blur(${round(blur)}px)`);
  if (round(look.brightness) !== 1)
    filter.push(`brightness(${round(look.brightness)})`);
  if (round(look.saturate) !== 1)
    filter.push(`saturate(${round(look.saturate)})`);

  const cut = [
    look.clipTop,
    look.clipRight,
    look.clipBottom,
    look.clipLeft,
  ].map((side) => round(Math.min(1, Math.max(0, side)) * 100));

  return {
    opacity: String(round(Math.min(1, Math.max(0, look.opacity)))),
    transform: transform.length > 0 ? transform.join(" ") : "none",
    filter: filter.length > 0 ? filter.join(" ") : "none",
    clipPath: cut.some((side) => side > 0)
      ? `inset(${cut.map((side) => `${side}%`).join(" ")})`
      : "none",
  };
}

export type Written = Css & { willChange: string };

export const blank = (): Written => ({
  opacity: "",
  transform: "",
  filter: "",
  clipPath: "",
  willChange: "",
});

// Writes only what changed since the last write.
export function paint(el: HTMLElement, next: Written, written: Written) {
  const { style } = el;
  if (next.opacity !== written.opacity) style.opacity = next.opacity;
  if (next.transform !== written.transform) style.transform = next.transform;
  if (next.filter !== written.filter) style.filter = next.filter;
  if (next.clipPath !== written.clipPath) style.clipPath = next.clipPath;
  if (next.willChange !== written.willChange)
    style.willChange = next.willChange;
  return next;
}
