import type { Engine, Frame, Pointer, Viewport } from "./engine";

interface SceneFrame {
  time: number;
  delta: number;
  quiet: boolean;
  scroll: number;
  pointer: Pointer;
  viewport: Viewport;
  width: number;
  height: number;
  ratio: number;
}

interface Renderer {
  draw(frame: SceneFrame): boolean | void;
  resize?(width: number, height: number, ratio: number): void;
  dispose?(): void;
}

export type SceneSetup = (
  canvas: HTMLCanvasElement,
  wake: () => void,
) => Renderer | null;

export function mountScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  setup: SceneSetup,
  { pixelRatio = 2 }: { pixelRatio?: number } = {},
) {
  const { clock } = engine;
  let woken = false;
  let wake = () => {
    woken = true;
  };
  const renderer = setup(canvas, () => wake());
  if (!renderer) return () => {};

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
        time: frame.time,
        delta: frame.delta,
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
    renderer.dispose?.();
  };
}
