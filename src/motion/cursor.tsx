"use client";

import { useEffect, useRef } from "react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import {
  CURSOR_CARD_FRAMING,
  CURSOR_FRAME_AWAY,
  CURSOR_FRAMING,
  CURSOR_IDLE,
  CURSOR_LABELS,
  CURSOR_LEAVE_GRACE,
  CURSOR_MAGNET,
  CURSOR_MAGNET_MAX,
  CURSOR_MOST,
  CURSOR_OWNER,
  CURSOR_REREAD_MS,
  CURSOR_RELEASED,
  CURSOR_ROW_MAX,
  CURSOR_SHAPES,
  CURSOR_SLATE,
  CURSOR_SLATE_MARGIN,
  CURSOR_SNAP_MAX,
  CURSOR_STEP,
  CURSOR_STILL,
  CURSOR_TEXT_INPUT,
  CURSOR_TURN,
  CURSOR_WRAP,
} from "./constants";
import { pointerSample, watchPointer } from "./engine";
import { useHydratedReducedMotion } from "./react";
import type {
  CursorBox,
  CursorInk,
  CursorMode,
  CursorReading,
  CursorSpring,
  SpringTune,
} from "./types";
import { layerOf, pullSpring, spring, tune, unitClamp } from "./utils";
import "./reticle.css";
import ticker from "./ticker.module.css";
const FOLLOW = tune(190, 0.9);
const GRIP = tune(360, 0.96);
const HUNT = tune(130, 0.78);
const FADE = tune(170, 1);
const PRESS = tune(420, 0.62);

const inks = new WeakMap<HTMLElement, CursorInk>();
let ruler: CanvasRenderingContext2D | null = null;

function inkOf(element: HTMLElement): CursorInk | null {
  const style = getComputedStyle(element);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const raw = element.textContent ?? "";
  const text =
    style.textTransform === "uppercase"
      ? raw.toUpperCase()
      : style.textTransform === "lowercase"
        ? raw.toLowerCase()
        : raw;
  const key = `${font}|${text}|${document.fonts.status}`;
  const known = inks.get(element);
  if (known?.key === key) return known;
  ruler ??= document.createElement("canvas").getContext("2d");
  if (!ruler || !text.trim()) return null;
  ruler.font = font;
  const m = ruler.measureText(text.trim());
  const ink: CursorInk = {
    above: m.fontBoundingBoxAscent - m.actualBoundingBoxAscent,
    below: m.fontBoundingBoxAscent + m.actualBoundingBoxDescent,
    key,
    lead: -m.actualBoundingBoxLeft,
    tail: m.width - m.actualBoundingBoxRight,
  };
  inks.set(element, ink);
  return ink;
}

/* A control's corner does not change while it is pointed at; read it once. */
const corners = new WeakMap<HTMLElement, number>();
function cornerOf(element: HTMLElement): number {
  let corner = corners.get(element);
  if (corner === undefined) {
    corner = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
    corners.set(element, corner);
  }
  return corner;
}

function boxOf(target: HTMLElement): CursorBox {
  const drawn = target.dataset.cursorBox?.split(",").map(Number);
  if (drawn?.length === 4 && drawn.every(Number.isFinite)) {
    const [left, top, right, bottom] = drawn as [
      number,
      number,
      number,
      number,
    ];
    return { bottom, left, right, top };
  }
  const picture =
    target.dataset.cursor === "card"
      ? target.querySelector<HTMLElement>("[data-cursor-frame]")
      : null;
  const plain = (picture ?? target).getBoundingClientRect();
  if (target.dataset.cursorFit !== "ink") return plain;
  const ink = inkOf(target);
  if (!ink) return plain;
  const box = {
    bottom: -Infinity,
    left: Infinity,
    right: -Infinity,
    top: Infinity,
  };
  const walk = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    if (!node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    for (const line of range.getClientRects()) {
      if (!line.width) continue;
      box.left = Math.min(box.left, line.left);
      box.right = Math.max(box.right, line.right);
      box.top = Math.min(box.top, line.top + ink.above);
      box.bottom = Math.max(box.bottom, line.top + ink.below);
    }
  }
  if (!Number.isFinite(box.left)) return plain;
  box.left += ink.lead;
  box.right -= ink.tail;
  return box;
}

function read(x: number, y: number): CursorReading {
  const hit = document.elementFromPoint(x, y);
  if (!hit || hit.tagName === "IFRAME") {
    return { label: "", mode: "none", target: null };
  }
  const layer = layerOf(hit);
  if (layer) return { label: "", mode: "none", target: layer };

  const dragging = hit.closest<HTMLElement>("[data-dragging]");
  if (dragging)
    return { label: CURSOR_LABELS.drag!, mode: "drag", target: dragging };

  const own = hit.closest<HTMLElement>(CURSOR_OWNER);
  if (own) {
    const named = own.dataset.cursor as CursorMode | undefined;
    if (named === "none") return { label: "", mode: "none", target: own };
    const label = own.dataset.cursorLabel ?? "";
    if (named === "wrap") {
      const box = boxOf(own);
      const inside =
        x >= box.left - CURSOR_FRAMING &&
        x <= box.right + CURSOR_FRAMING &&
        y >= box.top - CURSOR_FRAMING &&
        y <= box.bottom + CURSOR_FRAMING;
      if (inside) return { label: "", mode: "wrap", target: own };
    } else if (named && named in CURSOR_SHAPES) {
      const corner = Number.parseFloat(own.dataset.cursorCorner ?? "");
      return {
        corner: Number.isFinite(corner) ? corner : undefined,
        label: label || CURSOR_LABELS[named] || "",
        mode: named,
        target: own,
      };
    }
    if (own.matches(CURSOR_TEXT_INPUT))
      return { label: "", mode: "text", target: own };
    if (own.matches(":disabled, [aria-disabled='true']")) {
      return { label: "", mode: "idle", target: null };
    }
    const box = own.getBoundingClientRect();
    const fits = (limit: readonly [number, number]) =>
      box.width <= limit[0] && box.height <= limit[1];
    if (fits(CURSOR_SNAP_MAX) || fits(CURSOR_ROW_MAX)) {
      return { corner: cornerOf(own), label: "", mode: "action", target: own };
    }
  }

  const stage = document.querySelector<HTMLElement>("[data-cursor-stage]");
  if (stage) {
    const box = stage.getBoundingClientRect();
    const inside =
      x >= box.left &&
      x <= box.right &&
      y >= box.top &&
      y <= box.top + box.height * CURSOR_FRAME_AWAY;
    if (inside) return { label: "", mode: "frame", target: stage };
  }
  return { label: "", mode: "idle", target: null };
}

function Reticle() {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLSpanElement>(null);
  const brackets = useRef<HTMLSpanElement>(null);
  const slate = useRef<HTMLSpanElement>(null);
  const slateName = useRef<HTMLSpanElement>(null);
  const slateYear = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = root.current;
    const lens = body.current;
    const pin = dot.current;
    const text = words.current;
    const corners = brackets.current;
    const caption = slate.current;
    const name = slateName.current;
    const year = slateYear.current;
    if (!host || !lens || !pin || !text || !corners) return;
    if (!caption || !name || !year) return;

    const html = document.documentElement;
    const stopWatching = watchPointer();
    html.classList.add("reticle");

    const edge = {
      b: spring(),
      l: spring(),
      r: spring(),
      t: spring(),
    };
    const radius = spring(CURSOR_SHAPES.idle.r);
    const weights = {
      bead: spring(1),
      bracket: spring(),
      caption: spring(),
      dot: spring(1),
      glass: spring(1),
      label: spring(),
      presence: spring(),
      solid: spring(),
    };
    const press = spring(1);
    const slide = spring();
    let slateWidth = 0;

    let reading: CursorReading = { label: "", mode: "idle", target: null };
    let shown = "";
    let slated = "";
    let slating = "";
    let slatedAt = 0;
    const roll = (
      track: HTMLElement,
      value: string,
      way: number,
      still: boolean,
    ) => {
      for (const old of Array.from(track.children) as HTMLElement[]) {
        if (still || old.classList.contains(ticker.out)) {
          old.remove();
          continue;
        }
        old.className = `${ticker.out} [grid-area:1/1] truncate`;
        old.style.setProperty("--to", `${way * -0.7}em`);
        old.addEventListener("animationend", () => old.remove(), {
          once: true,
        });
      }
      if (!value) return;
      const word = document.createElement("span");
      word.className = still
        ? "[grid-area:1/1] truncate"
        : `${ticker.in} [grid-area:1/1] truncate`;
      word.style.setProperty("--from", `${way * 0.7}em`);
      word.textContent = value;
      track.append(word);
    };
    let dirty = true;
    let pressed = false;
    let landed = false;
    let leaving = 0;
    let busy = 0;
    let heading = { x: 1, y: 0 };
    let last = performance.now();
    let seen = { x: 0, y: 0 };
    let owed = 0;
    let raf = 0;
    let released: HTMLElement | null = null;
    /*
     * The box of the element the cursor holds. Reading it forces style and
     * layout whenever the page has written styles this frame, so it is read
     * when something could have moved it (the pointer, a scroll, a mutation)
     * and otherwise only every CURSOR_REREAD_MS while the cursor still moves.
     */
    let held: { at: number; box: CursorBox; target: HTMLElement } | null = null;
    let steady = false;
    let touched = true;
    const written = new Map<string, string>();
    const put = (
      element: HTMLElement,
      key: string,
      property:
        | "background"
        | "borderRadius"
        | "boxShadow"
        | "color"
        | "height"
        | "opacity"
        | "transform"
        | "width",
      value: string,
    ) => {
      if (written.get(key) === value) return;
      written.set(key, value);
      element.style[property] = value;
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const mark = () => {
      dirty = true;
      touched = true;
      wake();
    };
    const down = () => {
      pressed = true;
      wake();
    };
    const up = () => {
      pressed = false;
      mark();
    };

    const resolve = (now: number, x: number, y: number) => {
      const next = read(x, y);
      const holding =
        next.mode === "idle" &&
        reading.mode !== "idle" &&
        reading.mode !== "none" &&
        reading.target?.isConnected;
      if (holding) {
        leaving ||= now + CURSOR_LEAVE_GRACE;
        if (now < leaving) return;
      }
      leaving = 0;
      dirty = false;
      reading = next;
      if (next.mode === "card") slating = next.label;
      else if (next.label !== shown) {
        shown = next.label;
        if (next.label) text.textContent = next.label;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = Math.min((now - last) / 1000, CURSOR_MOST);
      last = now;
      if (elapsed <= 0) return;

      const pointer = pointerSample();
      const moved = touched;
      touched = false;
      const scrolling = html.hasAttribute("data-scrolling");
      if (scrolling) {
        if (reading.mode !== "none") reading = CURSOR_IDLE;
        dirty = true;
      } else if (dirty && pointer.present) {
        resolve(now, pointer.x, pointer.y);
      }

      const px = pointer.x;
      const py = pointer.y;
      const speed = Math.hypot(px - seen.x, py - seen.y) / elapsed;
      seen = { x: px, y: py };
      busy += (unitClamp(speed / 1800) - busy) * Math.min(elapsed * 7, 1);

      const hidden = reading.mode === "none" || !pointer.present;
      const off = reading.mode === "none" ? reading.target : null;
      if (off !== released) {
        released?.removeAttribute(CURSOR_RELEASED);
        off?.setAttribute(CURSOR_RELEASED, "");
        released = off;
      }
      const mode = reading.mode === "none" ? "idle" : reading.mode;
      const shape = CURSOR_SHAPES[mode];
      const snap =
        (mode === "action" || mode === "card" || mode === "wrap") &&
        Boolean(reading.target?.isConnected);

      let cx = px;
      let cy = py;
      let tw = shape.w;
      let th = shape.h;
      let tr = shape.r;

      if (snap) {
        const target = reading.target!;
        const stale =
          !held ||
          held.target !== target ||
          moved ||
          now - held.at >= CURSOR_REREAD_MS;
        if (stale) {
          const box = boxOf(target);
          const before = held?.target === target ? held.box : null;
          steady =
            before !== null &&
            Math.abs(before.left - box.left) < 0.5 &&
            Math.abs(before.top - box.top) < 0.5 &&
            Math.abs(before.right - box.right) < 0.5 &&
            Math.abs(before.bottom - box.bottom) < 0.5;
          held = { at: now, box, target };
        }
        const box = held!.box;
        const pad =
          mode === "wrap"
            ? CURSOR_FRAMING
            : mode === "card"
              ? CURSOR_CARD_FRAMING
              : CURSOR_WRAP;
        const corner = reading.corner ?? Number.NaN;
        const mx = (box.left + box.right) / 2;
        const my = (box.top + box.bottom) / 2;
        const lean = (to: number, from: number) =>
          Math.max(
            -CURSOR_MAGNET_MAX,
            Math.min((to - from) * CURSOR_MAGNET, CURSOR_MAGNET_MAX),
          );
        cx = mx + lean(px, mx);
        cy = my + lean(py, my);
        tw = box.right - box.left + pad * 2;
        th = box.bottom - box.top + pad * 2;
        tr = Math.min(
          (Number.isFinite(corner) ? corner : 12) + pad,
          Math.min(tw, th) / 2,
        );
      } else if (mode === "frame") {
        held = null;
        const grow = 1 + busy * 0.34;
        tw *= grow;
        th *= grow;
      }

      if (hidden && weights.presence.x < 0.02) landed = false;
      if (!landed && pointer.present) {
        edge.l.x = cx - tw / 2;
        edge.r.x = cx + tw / 2;
        edge.t.x = cy - th / 2;
        edge.b.x = cy + th / 2;
        radius.x = tr;
        for (const key of Object.keys(edge) as (keyof typeof edge)[]) {
          edge[key].v = 0;
        }
        landed = true;
      }

      if (slating !== slated) {
        const still = weights.caption.x < 0.06;
        const way = cx >= slatedAt ? 1 : -1;
        slated = slating;
        slatedAt = cx;
        const [, title = slated, made = ""] = CURSOR_SLATE.exec(slated) ?? [];
        roll(name, title, way, still);
        roll(year, made, way, still);
        year.hidden = !made;
      }

      const travel = snap ? GRIP : mode === "frame" ? HUNT : FOLLOW;
      const width = Math.max(edge.r.x - edge.l.x, 0);
      const height = Math.max(edge.b.x - edge.t.x, 0);
      const inset = 12 / Math.max(width, height, 1);
      const centred = Math.min(
        Math.max((width - slateWidth) / 2, CURSOR_SLATE_MARGIN - edge.l.x),
        window.innerWidth - CURSOR_SLATE_MARGIN - slateWidth - edge.l.x,
      );
      if (weights.caption.x < 0.06) slide.x = centred;

      const goals: [CursorSpring, number, SpringTune][] = [
        [edge.l, cx - tw / 2, travel],
        [edge.r, cx + tw / 2, travel],
        [edge.t, cy - th / 2, travel],
        [edge.b, cy + th / 2, travel],
        [radius, tr, travel],
        [weights.bead, mode === "idle" ? 1 : 0, FADE],
        [weights.bracket, shape.bracket, FADE],
        [weights.caption, shape.caption, FADE],
        [weights.dot, shape.dot, FADE],
        [weights.glass, shape.glass, FADE],
        [weights.label, shape.label, FADE],
        [weights.solid, shape.solid, FADE],
        [weights.presence, hidden ? 0 : 1, FADE],
        [press, pressed ? 1 - Math.min(inset, 0.14) : 1, PRESS],
        [slide, centred, FADE],
      ];
      owed += elapsed;
      while (owed >= CURSOR_STEP) {
        owed -= CURSOR_STEP;
        for (const [state, to, feel] of goals)
          pullSpring(state, to, CURSOR_STEP, feel);
      }

      const vx = (edge.l.v + edge.r.v) / 2;
      const vy = (edge.t.v + edge.b.v) / 2;
      const flow = Math.hypot(vx, vy);
      if (flow > 40) {
        const k = Math.min(elapsed * CURSOR_TURN, 1);
        const hx = heading.x + (vx / flow - heading.x) * k;
        const hy = heading.y + (vy / flow - heading.y) * k;
        const norm = Math.hypot(hx, hy) || 1;
        heading = { x: hx / norm, y: hy / norm };
      }
      const angle = Math.atan2(heading.y, heading.x);
      const smear = unitClamp(flow / 2600) * 0.42 * unitClamp(weights.bead.x);
      const along = 1 + smear;
      const across = 1 / along;

      const presence = unitClamp(weights.presence.x);
      const solid = unitClamp(weights.solid.x);
      const glass = unitClamp(weights.glass.x);
      const ink = Math.round(255 * (1 - solid));
      const scale = Math.max(press.x, 0);

      const fine = (n: number) => n.toFixed(3);
      put(host, "presence", "opacity", fine(presence));
      put(lens, "width", "width", `${width.toFixed(2)}px`);
      put(lens, "height", "height", `${height.toFixed(2)}px`);
      put(
        lens,
        "radius",
        "borderRadius",
        `${Math.max(radius.x, 0).toFixed(2)}px`,
      );
      put(
        lens,
        "lens",
        "transform",
        `translate3d(${edge.l.x.toFixed(2)}px, ${edge.t.x.toFixed(2)}px, 0) rotate(${fine(angle)}rad) scale(${fine(along * scale)}, ${fine(across * scale)}) rotate(${fine(-angle)}rad)`,
      );
      put(
        lens,
        "fill",
        "background",
        `rgb(255 255 255 / ${fine(glass * 0.035 * (1 - solid) + solid * 0.94)})`,
      );
      put(
        lens,
        "shadow",
        "boxShadow",
        `inset 0 0 0 1px rgb(255 255 255 / ${fine(glass * 0.3 * (1 - solid))}), 0 0 0 1px rgb(0 0 0 / ${fine((glass + solid) * 0.12)})`,
      );
      put(corners, "brackets", "opacity", fine(unitClamp(weights.bracket.x)));
      put(
        corners,
        "spread",
        "transform",
        `scale(${fine(1 + (1 - unitClamp(weights.bracket.x)) * 0.25)})`,
      );
      put(text, "label", "opacity", fine(unitClamp(weights.label.x)));
      put(caption, "caption", "opacity", fine(unitClamp(weights.caption.x)));
      put(caption, "slide", "transform", `translateX(${slide.x.toFixed(2)}px)`);
      put(text, "ink", "color", `rgb(${ink} ${ink} ${ink})`);
      put(
        pin,
        "pin",
        "transform",
        `translate3d(${px - 2.5}px, ${py - 2.5}px, 0)`,
      );
      put(pin, "dot", "opacity", fine(unitClamp(weights.dot.x) * presence));

      const resting =
        (!dirty || !pointer.present) &&
        !scrolling &&
        (!snap || steady) &&
        busy < 0.002 &&
        goals.every(
          ([state, to]) =>
            Math.abs(state.v) < CURSOR_STILL &&
            Math.abs(state.x - to) < CURSOR_STILL,
        );
      if (resting) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const env = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      html.classList.toggle("reticle", env.matches);
      wake();
    };
    sync();
    env.addEventListener("change", sync);

    const sizing = new ResizeObserver(([entry]) => {
      slateWidth = entry?.borderBoxSize[0]?.inlineSize ?? 0;
      wake();
    });
    sizing.observe(caption);

    const watch = new MutationObserver(mark);
    watch.observe(document.body, {
      attributeFilter: ["data-cursor", "data-cursor-label"],
      attributes: true,
      subtree: true,
    });
    window.addEventListener("pointermove", mark, { passive: true });
    window.addEventListener("scroll", mark, { capture: true, passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("blur", up);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
      sizing.disconnect();
      env.removeEventListener("change", sync);
      window.removeEventListener("pointermove", mark);
      window.removeEventListener("scroll", mark, { capture: true });
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", up);
      html.classList.remove("reticle");
      released?.removeAttribute(CURSOR_RELEASED);
      stopWatching();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden opacity-0 [@media(hover:none),(pointer:coarse)]:hidden"
      ref={root}
      style={{ zIndex: Z_INDEX.TOOLTIP + 20 }}
    >
      <div
        className="absolute top-0 left-0 flex items-center justify-center will-change-transform"
        ref={body}
      >
        <span
          className="absolute -inset-px"
          ref={brackets}
          style={{ opacity: 0 }}
        >
          <i className="absolute top-0 left-0 size-3.5 rounded-tl-mark border-t-[1.5px] border-l-[1.5px] border-ink-lead" />
          <i className="absolute top-0 right-0 size-3.5 rounded-tr-mark border-t-[1.5px] border-r-[1.5px] border-ink-lead" />
          <i className="absolute bottom-0 left-0 size-3.5 rounded-bl-mark border-b-[1.5px] border-l-[1.5px] border-ink-lead" />
          <i className="absolute right-0 bottom-0 size-3.5 rounded-br-mark border-r-[1.5px] border-b-[1.5px] border-ink-lead" />
        </span>
        <span
          className="tabular-nums type-micro leading-none font-bold tracking-label whitespace-nowrap uppercase"
          ref={words}
          style={{ opacity: 0 }}
        />
        <span
          className="absolute bottom-full left-0 mb-2.5 flex w-max max-w-[calc(100vw-2rem)] items-center gap-2 tabular-nums type-micro leading-none font-bold tracking-label whitespace-nowrap text-ink uppercase"
          ref={slate}
          style={{ opacity: 0 }}
        >
          <span
            className="relative inline-grid min-w-0 overflow-hidden"
            ref={slateName}
          />
          <span
            className="relative inline-grid shrink-0 overflow-hidden border-l border-edge-focus pl-2 text-ink-muted"
            hidden
            ref={slateYear}
          />
        </span>
      </div>
      <div
        className="absolute top-0 left-0 size-[5px] rounded-full bg-ink ring-1 ring-page/25"
        ref={dot}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

export function Cursor() {
  const reduced = useHydratedReducedMotion();
  return reduced ? null : <Reticle />;
}
