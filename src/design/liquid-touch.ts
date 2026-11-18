"use client";

import { useEffect } from "react";
import {
  clamp,
  drive,
  feel,
  type Goal,
  spring,
  type Spring,
} from "@/design/components/glass-thumb";

const SELECTOR = ".liquid-touch";
const OUTSIDE = ".dock-root";
const ACTION = "dock-action";
const SURFACE = ".dock-surface";
const SURFACE_SELECTOR = `${SELECTOR}, ${SURFACE} a[href]`;
const OFF = ":disabled, [aria-disabled='true']";

type Kind = "field" | "full";

const GIVE_PX = 4;
const MOST_GIVE = 0.06;
const PULL_PX = 2;
const SWELL_KICK = 0.32;

const PRESS_IN = feel(900, 0.95);
const PRESS_OUT = feel(250, 0.4);
const PULL = feel(240, 0.6);
const SWELL = feel(300, 0.42);

export function squeeze(width: number, height: number) {
  const long = Math.max(width, height, 1);
  return 1 - Math.min((GIVE_PX * 2) / long, MOST_GIVE);
}

export function pressOrigin(
  rect: { height: number; left: number; top: number; width: number },
  x: number,
  y: number,
) {
  return {
    ox: clamp(x - rect.left, 0, rect.width),
    oy: clamp(y - rect.top, 0, rect.height),
  };
}

interface Touch {
  down: boolean;
  el: HTMLElement;
  hover: boolean;
  kind: Kind;
  leans: boolean;
  press: Spring;
  rect: DOMRect;
  stale: boolean;
  swell: Spring;
  tx: Spring;
  ty: Spring;
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
      touch = {
        down: false,
        el,
        hover: false,
        kind: kindOf(el),
        leans: !el.closest(SURFACE),
        press: spring(1),
        rect: el.getBoundingClientRect(),
        stale: false,
        swell: spring(1),
        tx: spring(),
        ty: spring(),
        written: new Map(),
      };
      touches.set(el, touch);
    }
    return touch;
  };

  const put = (touch: Touch, name: string, value: string | null) => {
    if (touch.written.get(name) === (value ?? "")) return;
    touch.written.set(name, value ?? "");
    if (value === null) touch.el.style.removeProperty(name);
    else touch.el.style.setProperty(name, value);
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
      list.push(
        [
          touch.press,
          touch.down ? squeeze(rect.width, rect.height) : 1,
          touch.down ? PRESS_IN : PRESS_OUT,
        ],
        [touch.tx, lean(pointer.x, rect.left, rect.width), PULL],
        [touch.ty, lean(pointer.y, rect.top, rect.height), PULL],
      );
    }
    return list;
  };

  const draw = () => {
    const still = motion.matches;
    for (const touch of touches.values()) {
      const s = touch.kind === "full" ? touch.press.x : touch.swell.x;
      const x = touch.tx.x;
      const y = touch.ty.x;
      const rest =
        still ||
        (Math.abs(s - 1) < 0.0008 && Math.abs(x) < 0.02 && Math.abs(y) < 0.02);
      put(
        touch,
        "transform",
        rest
          ? null
          : `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`,
      );
      if (rest && !touch.down) put(touch, "transform-origin", null);
      const settled =
        Math.abs(touch.press.v) < 0.01 && Math.abs(touch.swell.v) < 0.01;
      if (rest && settled && !touch.hover && !touch.down) {
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
    hovered.rect = hovered.el.getBoundingClientRect();
    hovered.down = true;
    const { ox, oy } = pressOrigin(hovered.rect, pointer.x, pointer.y);
    put(hovered, "transform-origin", `${ox.toFixed(1)}px ${oy.toFixed(1)}px`);
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
    const touch = touchOf(el);
    touch.rect = el.getBoundingClientRect();
    touch.down = true;
    put(touch, "transform-origin", "50% 50%");
    loop.wake();
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
      for (const name of touch.written.keys()) {
        touch.el.style.removeProperty(name);
      }
    }
    touches.clear();
  };
}

export function LiquidTouch(): null {
  useEffect(() => startLiquidTouch(), []);
  return null;
}
