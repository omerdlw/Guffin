import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { CURVE } from "./curve";
import type { Engine } from "./engine";
import { step } from "./ladder";
import { Value } from "./value";

// One picture crossing from one page to the next. The part the hand pressed
// is lifted into a layer above both pages, waits there while the old page
// leaves, and flies onto the part that claims the same key on the new page.
// The claimed part is laid out in its final place but kept invisible, so the
// flight lands exactly where it will stay, and the part takes over on landing.

export const CARRY_FRESH = step(3);
export const CARRY_PATIENCE = step(6);
export const CARRY_FADE_RUNG = 0;

const LAYER = Z_INDEX.DOCK_BACKDROP - 10;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

interface Flight {
  key: string;
  shell: HTMLDivElement;
  from: Rect;
  target: HTMLElement | null;
  progress: Value | null;
  expire: ReturnType<typeof setTimeout>;
  release: () => void;
}

function rectOf(el: HTMLElement): Rect {
  const box = el.getBoundingClientRect();
  return {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    radius: Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
  };
}

const mix = (a: number, b: number, p: number) => a + (b - a) * p;

function place(shell: HTMLElement, rect: Rect) {
  const { style } = shell;
  style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
  style.width = `${rect.width}px`;
  style.height = `${rect.height}px`;
  style.borderRadius = `${rect.radius}px`;
}

export class Carrier {
  private sources = new Map<HTMLElement, string>();
  private pressed: { key: string; el: HTMLElement; at: number } | null = null;
  private flight: Flight | null = null;
  private listening = false;

  constructor(private engine: Engine) {}

  get airborne() {
    return this.flight?.key ?? null;
  }

  source(key: string, el: HTMLElement) {
    this.sources.set(el, key);
    this.listen();
    return () => {
      if (this.sources.get(el) === key) this.sources.delete(el);
    };
  }

  // Called as a page leaves: lifts the part the hand just pressed, if any.
  lift(): boolean {
    const pressed = this.pressed;
    this.pressed = null;
    if (typeof document === "undefined" || !pressed) return false;
    if (performance.now() - pressed.at > CARRY_FRESH * 1000) return false;
    if (!pressed.el.isConnected) return false;
    const from = rectOf(pressed.el);
    if (from.width === 0 || from.height === 0) return false;

    this.drop();
    const shell = document.createElement("div");
    shell.setAttribute("aria-hidden", "true");
    shell.style.cssText = `position:fixed;left:0;top:0;margin:0;overflow:hidden;pointer-events:none;contain:layout paint;z-index:${LAYER};`;
    const clone = pressed.el.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-part");
    clone.removeAttribute("id");
    clone.style.cssText +=
      ";position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:1;transform:none;filter:none;clip-path:none;visibility:visible;will-change:auto;";
    for (const image of clone.querySelectorAll("img")) image.loading = "eager";
    shell.append(clone);
    document.body.append(shell);
    place(shell, from);

    this.flight = {
      key: pressed.key,
      shell,
      from,
      target: null,
      progress: null,
      expire: setTimeout(() => this.drop(true), CARRY_PATIENCE * 1000),
      release: () => {},
    };
    return true;
  }

  // A part on the new page asks for the flight with its key. Returns whether
  // it got it; if so `land` runs once the picture is in place.
  claim(key: string, el: HTMLElement, duration: number, land: () => void) {
    const flight = this.flight;
    if (!flight || flight.key !== key || flight.target) return false;
    clearTimeout(flight.expire);
    flight.target = el;

    const progress = new Value(this.engine.clock);
    flight.progress = progress;
    const quiet = this.engine.reduced.get();
    let queued = false;
    const draw = () => {
      queued = false;
      if (!el.isConnected) return;
      const to = rectOf(el);
      const p = progress.current;
      place(flight.shell, {
        left: mix(flight.from.left, to.left, p),
        top: mix(flight.from.top, to.top, p),
        width: mix(flight.from.width, to.width, p),
        height: mix(flight.from.height, to.height, p),
        radius: mix(flight.from.radius, to.radius, p),
      });
    };
    flight.release = progress.subscribe(() => {
      if (queued) return;
      queued = true;
      this.engine.clock.once("render", draw);
    });

    void progress
      .to(1, { tween: quiet ? 0 : duration, curve: CURVE.glide })
      .then((finished) => {
        if (!finished || this.flight !== flight) return;
        land();
        // The part paints in this frame's render; the picture leaves after it.
        this.engine.clock.once("render", () => this.remove(flight));
      });
    return true;
  }

  // The claimed part went away mid-flight. It may only be remounting (React
  // strict mode does exactly that), so the flight waits a beat to be claimed
  // again before the picture fades where it is.
  abandon(el: HTMLElement) {
    const flight = this.flight;
    if (!flight || flight.target !== el) return;
    flight.progress?.stop();
    flight.progress = null;
    flight.release();
    flight.release = () => {};
    flight.target = null;
    flight.expire = setTimeout(() => this.drop(true), step(-2) * 1000);
  }

  private drop(fade = false) {
    const flight = this.flight;
    if (!flight) return;
    clearTimeout(flight.expire);
    flight.progress?.stop();
    if (!fade || this.engine.reduced.get()) return this.remove(flight);
    const opacity = new Value(this.engine.clock, 1);
    opacity.subscribe((o) => {
      flight.shell.style.opacity = String(o);
    });
    void opacity
      .to(0, { tween: step(CARRY_FADE_RUNG), curve: CURVE.fade })
      .then(() => this.remove(flight));
  }

  private remove(flight: Flight) {
    flight.release();
    flight.shell.remove();
    if (this.flight === flight) this.flight = null;
  }

  private listen() {
    if (this.listening || typeof document === "undefined") return;
    this.listening = true;
    const pick = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Enter") return;
      let node = event.target instanceof Element ? event.target : null;
      while (node) {
        if (node instanceof HTMLElement) {
          const key = this.sources.get(node);
          if (key) {
            this.pressed = { key, el: node, at: performance.now() };
            return;
          }
        }
        node = node.parentElement;
      }
    };
    document.addEventListener("pointerdown", pick, true);
    document.addEventListener("keydown", pick, true);
  }
}

const carriers = new WeakMap<Engine, Carrier>();

export function carrierOf(engine: Engine): Carrier {
  let carrier = carriers.get(engine);
  if (!carrier) {
    carrier = new Carrier(engine);
    carriers.set(engine, carrier);
  }
  return carrier;
}
