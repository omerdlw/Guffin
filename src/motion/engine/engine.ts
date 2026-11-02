import { createClock, type Clock } from "./clock";
import { Signal, type Source } from "./signal";

// The engine is the clock plus what the page can feel: where the scroll is,
// how big the window is, where the hand is, whether motion should be quiet.
// Pages never listen to the browser themselves; they read these.

export interface Viewport {
  width: number;
  height: number;
}

export interface Pointer {
  x: number;
  y: number;
  active: boolean;
}

export interface Engine {
  clock: Clock;
  scroll: Signal<number>;
  viewport: Source<Viewport>;
  pointer: Source<Pointer>;
  reduced: Source<boolean>;
  layout: Source<number>;
  dispose(): void;
}

export interface EngineOptions {
  clock?: Clock;
  scroll?: Source<number>;
  reduced?: Source<boolean>;
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const REST: Pointer = { x: 0, y: 0, active: false };

const sameViewport = (a: Viewport, b: Viewport) =>
  a.width === b.width && a.height === b.height;

const samePointer = (a: Pointer, b: Pointer) =>
  a.x === b.x && a.y === b.y && a.active === b.active;

export function createEngine(options: EngineOptions = {}): Engine {
  const clock = options.clock ?? createClock();
  const browser = typeof window !== "undefined";

  const scroll = new Signal(browser ? window.scrollY : 0);
  const viewport = new Signal<Viewport>(
    browser
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
    sameViewport,
  );
  const pointer = new Signal<Pointer>(REST, samePointer);
  const reduced = new Signal(browser ? matchMedia(REDUCED).matches : false);
  const layout = new Signal(0);
  const cleanup: (() => void)[] = [];

  if (browser) {
    const listen = <K extends keyof WindowEventMap>(
      type: K,
      handler: (event: WindowEventMap[K]) => void,
    ) => {
      window.addEventListener(type, handler, { passive: true });
      cleanup.push(() => window.removeEventListener(type, handler));
    };

    if (options.scroll) {
      const source = options.scroll;
      scroll.set(source.get());
      cleanup.push(source.subscribe((y) => scroll.set(y)));
    } else listen("scroll", () => scroll.set(window.scrollY));

    listen("resize", () =>
      viewport.set({ width: window.innerWidth, height: window.innerHeight }),
    );

    listen("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const { width, height } = viewport.get();
      if (width === 0 || height === 0) return;
      pointer.set({
        x: (event.clientX / width) * 2 - 1,
        y: (event.clientY / height) * 2 - 1,
        active: true,
      });
    });

    const away = (event: MouseEvent) => {
      if (event.relatedTarget === null) pointer.set(REST);
    };
    document.addEventListener("mouseout", away);
    cleanup.push(() => document.removeEventListener("mouseout", away));

    if (!options.reduced) {
      const media = matchMedia(REDUCED);
      const change = () => reduced.set(media.matches);
      media.addEventListener("change", change);
      cleanup.push(() => media.removeEventListener("change", change));
    }

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => layout.set(layout.get() + 1));
      observer.observe(document.documentElement);
      cleanup.push(() => observer.disconnect());
    }
  }

  return {
    clock,
    scroll,
    viewport,
    pointer,
    reduced: options.reduced ?? reduced,
    layout,
    dispose() {
      for (const stop of cleanup) stop();
      if (!options.clock) clock.dispose();
    },
  };
}

let shared: Engine | null = null;

export function sharedEngine(): Engine {
  shared ??= createEngine();
  return shared;
}
