"use client";

import { useEffect } from "react";
import {
  clamp,
  drive,
  feel,
  type Feel,
  type Goal,
  spring,
  type Spring,
} from "@/design/glass/spring";

const SELECTOR = ".liquid-touch";
const OUTSIDE = ".dock-root";
const ACTION = "dock-action";
const SURFACE = ".dock-surface";
const SURFACE_SELECTOR = `${SELECTOR}, ${SURFACE} a[href]`;
const OFF = ":disabled, [aria-disabled='true']";

type Kind = "field" | "full";

const PULL_PX = 2;
const SWELL_KICK = 0.32;
const GLOW_MOST = 160;
const GLOW_REST_SCALE = 4;

const PULL = feel(240, 0.6);
const SWELL = feel(300, 0.42);

// Apple's automatic flex & glow settings (macOS 26 interaction profile):
// a pressed control lifts by a few points, stretches toward a drag and
// carries a glow under the pointer. Small controls use the compact row;
// larger ones blend lower -> upper by their long side (lift and flex by
// the short side).
type Row = {
  wash: number;
  glow: number;
  far: number;
  lift: number;
  give: number;
  response: number;
  damping: number;
  glowResponse: number;
  glowDamping: number;
};

const row = (
  wash: number,
  glow: number,
  far: number,
  lift: number,
  give: number,
  response: number,
  damping: number,
  glowResponse: number,
): Row => ({
  wash,
  glow,
  far,
  lift,
  give,
  response,
  damping,
  glowResponse,
  glowDamping: 0.625,
});

const PROFILES = {
  cursor: {
    compact: row(1, 0.35, 50, 2.5, 60000, 0.25, 0.629, 0.262),
    lower: row(1, 1, 50, 2.25, 60000, 0.25, 0.375, 0.262),
    upper: row(0, 0.05, 25, 2, 70000, 0.25, 0.6, 0.314),
  },
  touch: {
    compact: row(1, 1, 50, 16, 2000, 0.4, 0.375, 0.262),
    lower: row(1, 1, 50, 16, 6000, 0.4, 0.375, 0.262),
    upper: row(0, 0.2, 50, 4, 24000, 0.36, 0.6, 0.314),
  },
};
const COMPACT_BELOW = 120;
const BLEND_FROM = 80;
const BLEND_TO = 160;

const BY_LONG = [
  "wash",
  "glow",
  "far",
  "response",
  "damping",
  "glowResponse",
  "glowDamping",
] as const;
const BY_SHORT = ["lift", "give"] as const;

type Profile = Row & { flex: Feel; glowFeel: Feel };

const byResponse = (response: number, damping: number) =>
  feel(((2 * Math.PI) / response) ** 2, damping);

function profileFor(width: number, height: number, touch: boolean): Profile {
  const set = touch ? PROFILES.touch : PROFILES.cursor;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  let values: Row;
  if (long < COMPACT_BELOW) values = set.compact;
  else {
    const span = BLEND_TO - BLEND_FROM;
    const along = clamp((long - BLEND_FROM) / span, 0, 1);
    const across = clamp((short - BLEND_FROM) / span, 0, 1);
    values = { ...set.lower };
    for (const key of BY_LONG) {
      values[key] = set.lower[key] + (set.upper[key] - set.lower[key]) * along;
    }
    for (const key of BY_SHORT) {
      values[key] = set.lower[key] + (set.upper[key] - set.lower[key]) * across;
    }
  }
  return {
    ...values,
    flex: byResponse(values.response, values.damping),
    glowFeel: byResponse(values.glowResponse, values.glowDamping),
  };
}

function flexOf(give: number, size: number, start: number, moved: number) {
  if (!moved || give <= 0) return 0;
  const inside = Math.abs(clamp(start + moved, 0, size) - start);
  return (Math.abs(moved) - inside) / give + inside / (give * 4);
}

interface Touch {
  down: boolean;
  el: HTMLElement;
  glows: boolean;
  hover: boolean;
  kind: Kind;
  leans: boolean;
  profile: Profile;
  rect: DOMRect;
  stale: boolean;
  start: { x: number; y: number };
  swell: Spring;
  sx: Spring;
  sy: Spring;
  dx: Spring;
  dy: Spring;
  tx: Spring;
  ty: Spring;
  glow: Spring;
  wash: Spring;
  glowScale: Spring;
  gx: Spring;
  gy: Spring;
  written: Map<string, string>;
}

const kindOf = (el: Element): Kind =>
  el.classList.contains("liquid-touch-field") ? "field" : "full";

function startLiquidTouch() {
  const touches = new Map<HTMLElement, Touch>();
  let hovered: Touch | null = null;
  let pointer = { x: 0, y: 0 };
  let fine = true;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const touchOf = (el: HTMLElement): Touch => {
    let touch = touches.get(el);
    if (!touch) {
      const rect = el.getBoundingClientRect();
      touch = {
        down: false,
        el,
        glows: false,
        hover: false,
        kind: kindOf(el),
        leans: !el.closest(SURFACE),
        profile: profileFor(rect.width, rect.height, false),
        rect,
        stale: false,
        start: { x: 0, y: 0 },
        swell: spring(1),
        sx: spring(1),
        sy: spring(1),
        dx: spring(),
        dy: spring(),
        tx: spring(),
        ty: spring(),
        glow: spring(),
        wash: spring(),
        glowScale: spring(GLOW_REST_SCALE),
        gx: spring(),
        gy: spring(),
        written: new Map(),
      };
      touches.set(el, touch);
    }
    return touch;
  };

  const clear = (touch: Touch, name: string) => {
    if (name.startsWith("data-")) touch.el.removeAttribute(name);
    else touch.el.style.removeProperty(name);
  };

  // Attributes are written only when they change; null removes them.
  const put = (touch: Touch, name: string, value: string | null) => {
    const known = touch.written.get(name);
    if (value === null ? known === undefined : known === value) return;
    if (value === null) {
      touch.written.delete(name);
      clear(touch, name);
    } else {
      touch.written.set(name, value);
      if (name.startsWith("data-")) touch.el.setAttribute(name, value);
      else touch.el.style.setProperty(name, value);
    }
  };

  const goals = (): Goal[] => {
    const list: Goal[] = [];
    for (const touch of touches.values()) {
      if (touch.stale) {
        touch.rect = touch.el.getBoundingClientRect();
        touch.stale = false;
      }
      if (touch.kind === "field") {
        list.push([touch.swell, 1, SWELL]);
        continue;
      }
      const { rect } = touch;
      const leaning = touch.leans && touch.hover && fine && !touch.down;
      const lean = (at: number, start: number, size: number) =>
        leaning && size > 0
          ? clamp((at - start - size / 2) / (size / 2), -1, 1) * PULL_PX
          : 0;
      const { profile, start, down } = touch;
      const { width: w, height: h } = rect;
      const moved = down
        ? {
            x: pointer.x - rect.left - start.x,
            y: pointer.y - rect.top - start.y,
          }
        : { x: 0, y: 0 };
      const base = down
        ? (Math.max(w, h) + profile.lift) / Math.max(w, h, 1)
        : 1;
      const a = flexOf(profile.give, w, start.x, moved.x);
      const b = flexOf(profile.give, h, start.y, moved.y);
      const far = Math.hypot(moved.x, moved.y) > profile.far;
      list.push(
        [touch.sx, base + a - b, profile.flex],
        [touch.sy, base - a + b, profile.flex],
        [touch.dx, w * a * Math.sign(moved.x), profile.flex],
        [touch.dy, h * b * Math.sign(moved.y), profile.flex],
        [touch.tx, lean(pointer.x, rect.left, rect.width), PULL],
        [touch.ty, lean(pointer.y, rect.top, rect.height), PULL],
      );
      if (touch.glows) {
        const glow = profile.glowFeel;
        list.push(
          [touch.glow, down ? profile.glow * (far ? 0.5 : 1) : 0, glow],
          [touch.wash, down ? profile.wash : 0, glow],
          [touch.glowScale, down ? (far ? 2 : 1) : GLOW_REST_SCALE, glow],
          [touch.gx, down ? clamp(start.x + moved.x, 0, w) : touch.gx.x, glow],
          [touch.gy, down ? clamp(start.y + moved.y, 0, h) : touch.gy.x, glow],
        );
      }
    }
    return list;
  };

  const draw = () => {
    const still = motion.matches;
    for (const touch of touches.values()) {
      const full = touch.kind === "full";
      const sx = full ? touch.sx.x : touch.swell.x;
      const sy = full ? touch.sy.x : touch.swell.x;
      const x = touch.tx.x + touch.dx.x;
      const y = touch.ty.x + touch.dy.x;
      const rest =
        still ||
        (Math.abs(sx - 1) < 0.0008 &&
          Math.abs(sy - 1) < 0.0008 &&
          Math.abs(x) < 0.02 &&
          Math.abs(y) < 0.02);
      put(
        touch,
        "transform",
        rest
          ? null
          : `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
      );
      const dark =
        still ||
        !touch.glows ||
        (touch.glow.x < 0.002 && touch.wash.x < 0.002 && !touch.down);
      put(touch, "data-touch-glow", dark ? null : "");
      if (!dark) {
        const { width, height } = touch.rect;
        const radius =
          (Math.min(1.5 * Math.min(width, height), GLOW_MOST) / 2) *
          touch.glowScale.x;
        put(touch, "--touch-glow-x", `${touch.gx.x.toFixed(1)}px`);
        put(touch, "--touch-glow-y", `${touch.gy.x.toFixed(1)}px`);
        put(touch, "--touch-glow-r", `${radius.toFixed(1)}px`);
        put(touch, "--touch-glow-a", touch.glow.x.toFixed(3));
        put(touch, "--touch-wash-a", touch.wash.x.toFixed(3));
      }
      const settled = [touch.sx, touch.sy, touch.swell, touch.glow].every(
        (state) => Math.abs(state.v) < 0.01,
      );
      if (rest && dark && settled && !touch.hover && !touch.down) {
        for (const name of touch.written.keys()) clear(touch, name);
        touches.delete(touch.el);
      }
    }
  };

  const loop = drive(goals, draw, () => false);

  const usable = (el: Element | null): el is HTMLElement =>
    el instanceof HTMLElement &&
    (el.classList.contains(ACTION) ||
      Boolean(el.closest(SURFACE)) ||
      !el.closest(OUTSIDE)) &&
    !el.matches(OFF);

  const glassUnder = (hit: EventTarget | null) => {
    if (!(hit instanceof Element)) return null;
    const own = hit.closest<HTMLElement>(
      hit.closest(SURFACE) ? SURFACE_SELECTOR : SELECTOR,
    );
    return usable(own) ? own : null;
  };

  const hover = (el: HTMLElement | null) => {
    if (hovered && hovered.el !== el) hovered.hover = false;
    hovered = el ? touchOf(el) : null;
    if (hovered) {
      hovered.hover = true;
      hovered.stale = true;
    }
  };

  const onMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
    fine = event.pointerType !== "touch";
    if (!fine && event.buttons === 0) return;
    const before = hovered;
    hover(glassUnder(event.target));
    if (hovered || before) loop.wake();
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    pointer = { x: event.clientX, y: event.clientY };
    fine = event.pointerType !== "touch";
    hover(glassUnder(event.target));
    if (!hovered || hovered.kind !== "full") return;
    press(hovered, !fine, {
      x: pointer.x,
      y: pointer.y,
    });
  };

  // The glow lights the control's own background, so it only shows on
  // controls that do not paint an image there already.
  const press = (
    touch: Touch,
    finger: boolean,
    at: { x: number; y: number } | null,
  ) => {
    const rect = touch.el.getBoundingClientRect();
    touch.rect = rect;
    touch.profile = profileFor(rect.width, rect.height, finger);
    touch.start = at
      ? {
          x: clamp(at.x - rect.left, 0, rect.width),
          y: clamp(at.y - rect.top, 0, rect.height),
        }
      : { x: rect.width / 2, y: rect.height / 2 };
    touch.glows =
      Boolean(at) &&
      (touch.written.has("data-touch-glow") ||
        getComputedStyle(touch.el).backgroundImage === "none");
    if (!touch.down && touch.glows) {
      touch.glow.v = 0;
      touch.glowScale.x = 1;
      touch.glowScale.v = 0;
      touch.gx.x = touch.start.x;
      touch.gy.x = touch.start.y;
      touch.gx.v = touch.gy.v = 0;
    }
    touch.down = true;
    loop.wake();
  };

  const release = () => {
    for (const touch of touches.values()) touch.down = false;
    loop.wake();
  };

  const onUp = (event: PointerEvent) => {
    release();
    if (event.pointerType === "touch") hover(null);
  };

  const onLeave = (event: PointerEvent) => {
    if (event.relatedTarget) return;
    hover(null);
    loop.wake();
  };

  const PRESS_KEYS = new Set([" ", "Enter"]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!PRESS_KEYS.has(event.key) || event.repeat) return;
    const el = glassUnder(event.target);
    if (!el || kindOf(el) !== "full") return;
    press(touchOf(el), false, null);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (PRESS_KEYS.has(event.key)) release();
  };

  const onFocusIn = (event: FocusEvent) => {
    const el = glassUnder(event.target);
    if (!el || kindOf(el) !== "field" || motion.matches) return;
    touchOf(el).swell.v += SWELL_KICK;
    loop.wake();
  };

  const onFocusOut = (event: FocusEvent) => {
    const el = glassUnder(event.target);
    const touch = el ? touches.get(el) : undefined;
    if (!touch) return;
    touch.down = false;
    loop.wake();
  };

  const onScroll = () => {
    if (!touches.size) return;
    for (const touch of touches.values()) touch.stale = true;
    loop.wake();
  };

  const listen: [keyof WindowEventMap, EventListener][] = [
    ["pointermove", onMove as EventListener],
    ["pointerdown", onDown as EventListener],
    ["pointerup", onUp as EventListener],
    ["pointercancel", onUp as EventListener],
    ["pointerout", onLeave as EventListener],
    ["keydown", onKeyDown as EventListener],
    ["keyup", onKeyUp as EventListener],
    ["focusin", onFocusIn as EventListener],
    ["focusout", onFocusOut as EventListener],
    ["blur", release],
  ];
  for (const [name, fn] of listen) {
    window.addEventListener(name, fn, { passive: true });
  }
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });

  return () => {
    loop.stop();
    for (const [name, fn] of listen) window.removeEventListener(name, fn);
    window.removeEventListener("scroll", onScroll, { capture: true });
    for (const touch of touches.values()) {
      for (const name of touch.written.keys()) clear(touch, name);
    }
    touches.clear();
  };
}

export function LiquidTouch(): null {
  useEffect(() => startLiquidTouch(), []);
  return null;
}
