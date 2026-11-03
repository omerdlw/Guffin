import type { Frame } from "./clock";
import type { Pointer, Viewport } from "./engine";
import { neutral, type Look } from "./look";
import type { PartOptions, PartState, Stage } from "./stage";

// A canvas is a part like any other: it arrives, leaves, sinks into depth and
// leans toward the hand by the same laws. Instead of CSS it is handed the look
// each frame, and draws it however it likes (WebGL, 2D). It draws only when
// something changed, or every frame while it asks to, and never off screen.

export interface SceneFrame extends PartState {
  time: number;
  delta: number;
  look: Look;
  scroll: number;
  pointer: Pointer;
  viewport: Viewport;
  width: number;
  height: number;
  ratio: number;
}

export interface Renderer {
  // Return true to be drawn again next frame.
  draw(frame: SceneFrame): boolean | void;
  resize?(width: number, height: number, ratio: number): void;
  dispose?(): void;
}

// `wake` asks for one more draw: a renderer whose own state changed (a
// picture loaded, a new one chosen) calls it to be drawn again.
export type SceneSetup = (
  canvas: HTMLCanvasElement,
  wake: () => void,
) => Renderer | null;

export interface SceneOptions extends Omit<PartOptions, "render"> {
  pixelRatio?: number;
}

export function mountScene<P extends string, S extends string>(
  stage: Stage<P, S>,
  name: P,
  canvas: HTMLCanvasElement,
  setup: SceneSetup,
  { pixelRatio = 2, ...part }: SceneOptions = {},
) {
  const { engine } = stage;
  const { clock } = engine;
  let woken = false;
  let wake = () => {
    woken = true;
  };
  const renderer = setup(canvas, () => wake());
  if (!renderer) {
    const handle = stage.register(name, canvas, part);
    return () => handle.dispose();
  }

  let look = neutral();
  let state: PartState = { enter: 0, leave: 0, moving: false, quiet: false };
  let visible = true;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let queued = false;
  let looping: (() => void) | null = null;

  const stopLoop = () => {
    looping?.();
    looping = null;
  };

  const draw = (frame: Frame) => {
    queued = false;
    if (!visible || width === 0 || height === 0) return stopLoop();
    const quiet = engine.reduced.get();
    const more =
      renderer.draw({
        ...state,
        time: frame.time,
        delta: frame.delta,
        look,
        quiet,
        scroll: engine.scroll.get(),
        pointer: engine.pointer.get(),
        viewport: engine.viewport.get(),
        width,
        height,
        ratio,
      }) === true && !quiet;
    if (more && !looping) looping = clock.add("render", draw);
    else if (!more) stopLoop();
  };

  const request = () => {
    if (looping || queued) return;
    queued = true;
    clock.once("render", draw);
  };
  wake = request;

  const fit = () => {
    ratio = Math.min(window.devicePixelRatio || 1, pixelRatio);
    const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    renderer.resize?.(w, h, ratio);
    request();
  };

  fit();
  if (woken) request();
  const sizing = new ResizeObserver(fit);
  sizing.observe(canvas);
  const sight = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
  });
  sight.observe(canvas);

  const handle = stage.register(name, canvas, {
    ...part,
    render: (next, nextState) => {
      look = next;
      state = nextState;
      request();
    },
  });
  const senses = [
    engine.scroll.subscribe(request),
    engine.pointer.subscribe(request),
    engine.reduced.subscribe(request),
  ];

  return () => {
    for (const stop of senses) stop();
    sizing.disconnect();
    sight.disconnect();
    stopLoop();
    handle.dispose();
    renderer.dispose?.();
  };
}
