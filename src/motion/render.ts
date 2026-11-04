import { neutral } from "./color";
import { TEXT_WORD_ATTRIBUTE } from "./constants";
import type { Stage } from "./stage";
import type {
  Frame,
  PartOptions,
  PartState,
  SceneOptions,
  SceneSetup,
  Split,
} from "./types";
import { compile, lines } from "./utils";

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

const FULLSCREEN_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export function createProgram(
  gl: WebGL2RenderingContext,
  fragment: string,
  vertex = FULLSCREEN_VERTEX,
) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function bindFullscreen(
  gl: WebGL2RenderingContext,
  ...programs: WebGLProgram[]
) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  for (const program of programs) {
    const location = gl.getAttribLocation(program, "aPosition");
    if (location < 0) continue;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  }
}

export function uniforms<T extends string>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly T[],
) {
  return Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<T, WebGLUniformLocation | null>;
}

export function fitCanvas(canvas: HTMLCanvasElement, cap: number) {
  const ratio = Math.min(window.devicePixelRatio || 1, cap);
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

export const readable = (src: string) =>
  `${src}${src.includes("?") ? "&" : "?"}gl`;

export function sampleClamped(
  gl: WebGL2RenderingContext,
  min: number = gl.LINEAR,
  target: number = gl.TEXTURE_2D,
) {
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, min);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export function createTexture(
  gl: WebGL2RenderingContext,
  min: number = gl.LINEAR,
  target: number = gl.TEXTURE_2D,
): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(target, texture);
  sampleClamped(gl, min, target);
  return texture;
}

export const words = (text: string) => text.split(/\s+/).filter(Boolean);

export const letters = (word: string) => Array.from(word);

export function mountText<P extends string, S extends string>(
  stage: Stage<P, S>,
  name: P,
  container: HTMLElement,
  split: Split,
  part: Omit<PartOptions, "index" | "render" | "carry"> = {},
) {
  const spans = Array.from(
    container.querySelectorAll<HTMLElement>(`[${TEXT_WORD_ATTRIBUTE}]`),
  );
  const order = split === "line" ? lines(spans) : spans.map((_, i) => i);
  const handles = spans.map((span, i) =>
    stage.register(name, span, {
      cadence: "even",
      ...part,
      index: order[i],
    }),
  );
  return () => {
    for (const handle of handles) handle.dispose();
  };
}
