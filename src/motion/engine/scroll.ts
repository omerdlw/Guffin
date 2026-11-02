import type { Engine } from "./engine";
import { clamp, step } from "./ladder";
import { Value } from "./value";

// The wheel as a force. A wheel step moves the target; the page follows on a
// critically damped spring whose period is a rung on the ladder, so a heavier
// page (higher tempo) scrolls heavier. Everything else the browser does
// itself (keys, scrollbar, touch, anchors) is adopted, never fought.

export const SCROLL_RUNG = 1;

const LINE = 40;
const LATCH = 160;
const SCROLLING = "data-scrolling";

export interface ScrollTarget {
  offset?: number;
  immediate?: boolean;
}

function wheelPixels(event: WheelEvent) {
  if (event.deltaMode === 1) return event.deltaY * LINE;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function scrollsInside(target: EventTarget | null, delta: number) {
  let element = target instanceof Element ? target : null;
  while (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    if (element instanceof HTMLElement) {
      if (element.hasAttribute("data-scroll-native")) return true;
      const { overflowY } = getComputedStyle(element);
      const scrolls =
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay";
      if (scrolls && element.scrollHeight > element.clientHeight + 1) {
        const atTop = element.scrollTop <= 0;
        const atEnd =
          element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
        if ((delta < 0 && !atTop) || (delta > 0 && !atEnd)) return true;
      }
    }
    element = element.parentElement;
  }
  return false;
}

function locked() {
  const root = getComputedStyle(document.documentElement).overflowY;
  const body = getComputedStyle(document.body).overflowY;
  return root === "hidden" || root === "clip" || body === "hidden";
}

export class ScrollDriver {
  private position: Value;
  private tempo = 0;
  private written = 0;
  private started = false;
  private resting: (() => void) | null = null;
  private latch = {
    at: 0,
    inside: false,
    sign: 0,
    target: null as EventTarget | null,
  };
  private detach: (() => void)[] = [];

  constructor(private engine: Engine) {
    this.position = new Value(engine.clock, 0, 0.1);
  }

  get moving() {
    return this.position.moving;
  }

  get active() {
    return this.started;
  }

  get destination() {
    return this.position.target;
  }

  private get spring() {
    return { period: step(SCROLL_RUNG + this.tempo), damping: 1, mass: 1 };
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.position.set(window.scrollY);
    this.written = window.scrollY;

    const stop = this.position.subscribe((y) => this.follow(y));
    const options = { passive: false, capture: true } as const;
    window.addEventListener("wheel", this.wheel, options);
    window.addEventListener("scroll", this.adopt, { passive: true });
    this.detach = [
      stop,
      () => window.removeEventListener("wheel", this.wheel, options),
      () => window.removeEventListener("scroll", this.adopt),
    ];
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    this.position.stop();
    for (const stop of this.detach) stop();
    this.detach = [];
    this.rest();
  }

  // A page shifts the weight of its scroll with its tempo, and gives it back.
  tune(tempo: number) {
    const previous = this.tempo;
    this.tempo = tempo;
    return () => {
      this.tempo = previous;
    };
  }

  to(
    destination: number | Element,
    { offset = 0, immediate = false }: ScrollTarget = {},
  ) {
    if (typeof window === "undefined") return;
    const top =
      typeof destination === "number"
        ? destination
        : destination.getBoundingClientRect().top + window.scrollY;
    const y = clamp(top + offset, 0, this.limit());
    if (immediate || this.quiet()) {
      this.written = y;
      window.scrollTo({ top: y, behavior: "instant" });
      this.position.set(y);
      return;
    }
    this.position.to(y, { spring: this.spring });
  }

  private quiet() {
    return this.engine.reduced.get();
  }

  private limit() {
    return Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
  }

  private follow(y: number) {
    const ratio = window.devicePixelRatio || 1;
    const snapped = Math.round(y * ratio) / ratio;
    this.engine.scroll.set(snapped);
    if (snapped === this.written) return;
    this.written = snapped;
    this.engine.clock.once("render", () => {
      if (window.scrollY !== this.written)
        window.scrollTo({ top: this.written, behavior: "instant" });
    });
    this.scrolling();
  }

  private scrolling() {
    if (!this.resting) document.documentElement.setAttribute(SCROLLING, "");
    this.resting?.();
    const timer = setTimeout(() => this.rest(), step(-2) * 1000);
    this.resting = () => clearTimeout(timer);
  }

  private rest() {
    this.resting?.();
    this.resting = null;
    document.documentElement.removeAttribute(SCROLLING);
  }

  private inside(event: WheelEvent) {
    const latch = this.latch;
    const sign = Math.sign(event.deltaY);
    if (
      latch.target !== event.target ||
      latch.sign !== sign ||
      event.timeStamp - latch.at > LATCH
    ) {
      latch.inside = scrollsInside(event.target, event.deltaY);
      latch.sign = sign;
      latch.target = event.target;
    }
    latch.at = event.timeStamp;
    return latch.inside;
  }

  private wheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    if (event.shiftKey || event.deltaY === 0) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (this.quiet() || this.inside(event) || locked()) return;
    event.preventDefault();
    const from = this.moving ? this.position.target : this.position.current;
    const y = clamp(from + wheelPixels(event), 0, this.limit());
    this.position.to(y, { spring: this.spring });
  };

  // The browser moved the page on its own: take its word for where we are.
  private adopt = () => {
    const y = window.scrollY;
    if (Math.abs(y - this.written) <= 1) return;
    this.written = y;
    this.position.set(y);
  };
}

const drivers = new WeakMap<Engine, ScrollDriver>();

export function driverOf(engine: Engine): ScrollDriver {
  let driver = drivers.get(engine);
  if (!driver) {
    driver = new ScrollDriver(engine);
    drivers.set(engine, driver);
  }
  return driver;
}
