import type { CanonFilm, Loop, LoopFactory } from "@/features/spotlights/model";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { createProgram, readable, uniforms } from "@/motion/webgl/gl";

async function loadBitmap(
  src: string,
  options: { height?: number; signal?: AbortSignal; width?: number } = {},
): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const response = await fetch(readable(src), {
      mode: "cors",
      signal: options.signal,
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return options.width && options.height
      ? await createImageBitmap(blob, {
          resizeHeight: options.height,
          resizeQuality: "high",
          resizeWidth: options.width,
        })
      : await createImageBitmap(blob);
  } catch {
    return null;
  }
}

interface TunnelEvents {
  selected(index: number): void;
}

export interface TunnelFonts {
  body: string;
  display: string;
}

interface Print {
  at: number;
  sharp: boolean;
  texture: WebGLTexture;
}

interface Hand {
  at: number;
  moved: number;
  velocity: number;
  y: number;
}

interface Slot {
  film: number;
  slot: number;
}

// The tunnel is measured in poster heights. Each wall holds ROWS posters
// one above the other; a column is one poster wide, so a cell is exactly a
// poster and the grid lines are the posters' edges.
const ROWS = 2;
const CELL_H = 1;
const CELL_W = 2 / 3;
const HALF_H = (ROWS * CELL_H) / 2;
const FLOOR_CELLS = 4;
const HALF_W = (FLOOR_CELLS * CELL_W) / 2;
const PER_COLUMN = ROWS * 2;

const FOV_Y = (56 * Math.PI) / 180;
const FOV_X_MIN = (64 * Math.PI) / 180;
const NEAR = 0.05;
const FAR = 60;
const AHEAD = 44;
const FOG = { end: 27, start: 8 };
const LINE_ALPHA = 0.045;
// Each print sits inside its cell with a margin, keeping 2:3, so the grid
// lines show around every poster.
const POSTER_FILL = 0.84;
const REST_OFFSET = 0.004;

const VIEW_DISTANCE = 2.6;
const POP = { grow: 0.06, lift: 0.34, turn: (24 * Math.PI) / 180 };
const SELECTED_LIFT = 0.05;
const SHADE = { dim: 0.42, hover: 1.06, rest: 0.84, selected: 1 };
const SWAY = { x: 0.2, y: 0.11 };

const WHEEL = 1 / 140;
const DRAG = 1 / 85;
const FLING_S = 0.2;
const CLICK_SLOP = 6;
const RATE = { fly: 0.9, free: 0.42, hover: 0.32, sway: 0.9 };
const REVEAL_S = 0.7;
const FADE_IN_S = 0.45;

const OPEN_READY = 12;
const OPEN_PATIENCE_MS = 2500;
const LOADS = 6;
const BASE = { height: 384, width: 256 };
const SHARP = { height: 768, kept: 18, reach: 4, waitMs: 160, width: 512 };
const LABEL = { height: 720, width: 480 };

const wrap = (value: number, by: number) => ((value % by) + by) % by;

const approach = (from: number, to: number, time: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / Math.max(1e-4, time / 4));

const smooth = (t: number) => t * t * (3 - 2 * t);

const SHELL_VERTEX = `#version 300 es
in vec4 aPos;
uniform mat4 uViewProj;
uniform vec2 uSpan;
out vec3 vWorld;
flat out int vFace;
void main() {
  vec3 p = vec3(aPos.xy, mix(uSpan.x, uSpan.y, aPos.z));
  vWorld = p;
  vFace = int(aPos.w);
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

const SHELL_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
flat in int vFace;
uniform vec3 uInk;
uniform vec3 uCell;
uniform float uEyeZ;
uniform vec2 uFog;
uniform float uLine;
uniform float uAlpha;
out vec4 outColor;

float grid(vec2 coord) {
  vec2 d = max(fwidth(coord), vec2(1e-5));
  vec2 px = abs(fract(coord + 0.5) - 0.5) / d;
  float half_ = uLine * 0.5;
  vec2 hit = 1.0 - smoothstep(vec2(half_ - 0.5), vec2(half_ + 0.5), px);
  // Where the lines crowd closer than a few pixels they would shimmer, so
  // they fade out before they get there.
  hit *= 1.0 - smoothstep(0.16, 0.4, d);
  return max(hit.x, hit.y);
}

void main() {
  vec2 coord = vFace < 2
    ? vec2(vWorld.z / uCell.x, vWorld.y / uCell.y + 0.5 * uCell.z)
    : vec2(vWorld.x / uCell.x, vWorld.z / uCell.x);
  float depth = uEyeZ - vWorld.z;
  float fog = 1.0 - smoothstep(uFog.x, uFog.y, depth);
  float a = grid(coord) * uAlpha * fog;
  outColor = vec4(uInk * a, a);
}`;

const POSTER_VERTEX = `#version 300 es
in vec2 aCorner;
uniform mat4 uViewProj;
uniform vec3 uCenter;
uniform vec2 uSize;
uniform float uSide;
uniform float uPop;
uniform float uLift;
uniform vec3 uShape;
uniform float uEyeZ;
out vec2 vUv;
out float vDepth;
void main() {
  float turn = uShape.z * uPop;
  vec3 normal = vec3(uSide * cos(turn), 0.0, sin(turn));
  vec3 across = vec3(sin(turn), 0.0, -uSide * cos(turn));
  float grow = 1.0 + uShape.x * uPop;
  vec3 p = uCenter
    + normal * (uLift + uShape.y * uPop)
    + across * aCorner.x * uSize.x * grow
    + vec3(0.0, aCorner.y * uSize.y * grow, 0.0);
  vUv = vec2(aCorner.x + 0.5, 0.5 - aCorner.y);
  vDepth = uEyeZ - p.z;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

const POSTER_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
in float vDepth;
uniform sampler2D uTex;
uniform sampler2D uLabelTex;
uniform float uShade;
uniform float uAlpha;
uniform float uLabel;
uniform float uEdge;
uniform vec3 uInk;
uniform vec2 uFog;
uniform float uLine;
out vec4 outColor;
void main() {
  vec3 color = texture(uTex, vUv).rgb * uShade;
  vec4 label = texture(uLabelTex, vUv) * uLabel;
  color = color * (1.0 - label.a) + label.rgb;
  vec2 d = max(fwidth(vUv), vec2(1e-5));
  vec2 px = min(vUv, 1.0 - vUv) / d;
  float edge = 1.0 - smoothstep(uLine * 0.5 - 0.5, uLine * 0.5 + 0.5, min(px.x, px.y));
  color = mix(color, uInk, edge * uEdge);
  float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDepth);
  float a = uAlpha * fog;
  outColor = vec4(color * a, a);
}`;

const SHELL_UNIFORMS = [
  "uViewProj",
  "uSpan",
  "uInk",
  "uCell",
  "uEyeZ",
  "uFog",
  "uLine",
  "uAlpha",
] as const;

const POSTER_UNIFORMS = [
  "uViewProj",
  "uCenter",
  "uSize",
  "uSide",
  "uPop",
  "uLift",
  "uShape",
  "uEyeZ",
  "uTex",
  "uLabelTex",
  "uShade",
  "uAlpha",
  "uLabel",
  "uEdge",
  "uInk",
  "uFog",
  "uLine",
] as const;

// Four faces as [x, y, depth share, face]: left, right, floor, ceiling.
function shellVertices(): Float32Array {
  const face = (corners: number[][], id: number) =>
    [0, 1, 2, 0, 2, 3].flatMap((i) => [...corners[i]!, id]);
  return new Float32Array([
    ...face(
      [
        [-HALF_W, -HALF_H, 0],
        [-HALF_W, HALF_H, 0],
        [-HALF_W, HALF_H, 1],
        [-HALF_W, -HALF_H, 1],
      ],
      0,
    ),
    ...face(
      [
        [HALF_W, -HALF_H, 0],
        [HALF_W, HALF_H, 0],
        [HALF_W, HALF_H, 1],
        [HALF_W, -HALF_H, 1],
      ],
      1,
    ),
    ...face(
      [
        [-HALF_W, -HALF_H, 0],
        [HALF_W, -HALF_H, 0],
        [HALF_W, -HALF_H, 1],
        [-HALF_W, -HALF_H, 1],
      ],
      2,
    ),
    ...face(
      [
        [-HALF_W, HALF_H, 0],
        [HALF_W, HALF_H, 0],
        [HALF_W, HALF_H, 1],
        [-HALF_W, HALF_H, 1],
      ],
      3,
    ),
  ]);
}

export class Tunnel {
  private readonly shell: WebGLProgram;
  private readonly poster: WebGLProgram;
  private readonly shellAt: Record<
    (typeof SHELL_UNIFORMS)[number],
    WebGLUniformLocation | null
  >;
  private readonly posterAt: Record<
    (typeof POSTER_UNIFORMS)[number],
    WebGLUniformLocation | null
  >;
  private readonly shellVao: WebGLVertexArrayObject | null;
  private readonly posterVao: WebGLVertexArrayObject | null;
  private readonly buffers: WebGLBuffer[] = [];
  private readonly prints: (Print | null)[];
  private readonly loading = new Set<number>();
  private readonly failed = new Set<number>();
  private readonly sharpLoading = new Set<number>();
  private readonly pops = new Map<number, number>();
  private readonly labelTexture: WebGLTexture | null;
  private readonly labelCanvas: HTMLCanvasElement;
  private readonly count: number;
  private readonly anisotropy: number;
  private readonly anisotropic: EXT_texture_filter_anisotropic | null;
  private readonly patience: ReturnType<typeof setTimeout>;
  private readonly loop: Loop;

  private width = 1;
  private height = 1;
  private ratio = 1;
  private ink: readonly [number, number, number] = [1, 1, 1];
  private fonts: TunnelFonts = { body: "sans-serif", display: "sans-serif" };
  private pos: number;
  private target: number;
  private flying = false;
  // Nothing is chosen until a poster is tapped; the dock stays empty.
  private chosen: number | null = null;
  private readonly origin: number;
  private chosenMix = 1;
  // Slots run negative when walking back past the start, so "none" is null.
  private hovered: number | null = null;
  private hoverMix = 0;
  private labelSlot: number | null = null;
  private pointer: { x: number; y: number } | null = null;
  private sway = { x: 0, y: 0 };
  private hand: Hand | null = null;
  private time = 0;
  private reveal = 0;
  private loaded = 0;
  private opened = false;
  private reduced = false;
  private disposed = false;
  private sharpTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly abort = new AbortController();

  static create(
    canvas: HTMLCanvasElement,
    films: readonly CanonFilm[],
    start: number,
    events: TunnelEvents,
    loop: LoopFactory,
  ): Tunnel | null {
    if (films.length === 0) return null;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: true,
    });
    if (!gl) return null;
    const shell = createProgram(gl, SHELL_FRAGMENT, SHELL_VERTEX);
    const poster = createProgram(gl, POSTER_FRAGMENT, POSTER_VERTEX);
    if (!shell || !poster) return null;
    return new Tunnel(gl, shell, poster, films, start, events, loop);
  }

  private constructor(
    private readonly gl: WebGL2RenderingContext,
    shell: WebGLProgram,
    poster: WebGLProgram,
    private readonly films: readonly CanonFilm[],
    start: number,
    private readonly events: TunnelEvents,
    loop: LoopFactory,
  ) {
    this.shell = shell;
    this.poster = poster;
    this.shellAt = uniforms(gl, shell, SHELL_UNIFORMS);
    this.posterAt = uniforms(gl, poster, POSTER_UNIFORMS);
    this.count = films.length;
    this.prints = films.map(() => null);
    this.anisotropic = gl.getExtension("EXT_texture_filter_anisotropic");
    this.anisotropy = this.anisotropic
      ? Math.min(
          8,
          gl.getParameter(this.anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT),
        )
      : 0;

    this.shellVao = gl.createVertexArray();
    gl.bindVertexArray(this.shellVao);
    this.attribute(shell, "aPos", shellVertices(), 4);
    this.posterVao = gl.createVertexArray();
    gl.bindVertexArray(this.posterVao);
    this.attribute(
      poster,
      "aCorner",
      new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
      2,
    );
    gl.bindVertexArray(null);

    this.labelCanvas = document.createElement("canvas");
    this.labelCanvas.width = LABEL.width;
    this.labelCanvas.height = LABEL.height;
    this.labelTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.labelTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(4),
    );
    this.sample(gl.LINEAR);

    // The starting film is the first of its kind ahead of the entrance.
    this.origin = this.count - 1 - Math.min(Math.max(start, 0), this.count - 1);
    this.pos = this.target = this.standFor(this.origin);
    this.loop = loop((now, dt) => this.frame(now, dt));
    this.patience = setTimeout(() => this.open(), OPEN_PATIENCE_MS);
    this.pump();
    this.loop.wake();
  }

  get selected(): number {
    return this.chosen === null ? -1 : this.filmOf(this.chosen);
  }

  resize(width: number, height: number, ratio: number): void {
    this.width = width;
    this.height = height;
    this.ratio = ratio;
    this.loop.wake();
  }

  setInk(ink: readonly [number, number, number]): void {
    this.ink = [ink[0] / 255, ink[1] / 255, ink[2] / 255];
    this.labelSlot = null;
    this.loop.wake();
  }

  setFonts(fonts: TunnelFonts): void {
    this.fonts = fonts;
    this.labelSlot = null;
    this.loop.wake();
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.loop.wake();
  }

  point(x: number | null, y: number | null): void {
    this.pointer = x === null || y === null ? null : { x, y };
    this.loop.wake();
  }

  // Steps the choice one place along the countdown and flies to it.
  step(direction: -1 | 1): void {
    this.choose(this.chosen === null ? this.origin : this.chosen + direction);
  }

  // Home and End: No. 100 or No. 1 of the lap the choice is on.
  jump(to: "first" | "last"): void {
    const from = this.chosen ?? this.origin;
    const lapStart = from - wrap(from, this.count);
    this.choose(to === "first" ? lapStart : lapStart + this.count - 1);
  }

  scroll(dx: number, dy: number): void {
    const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    this.flying = false;
    this.target += delta * WHEEL;
    this.loop.wake();
  }

  grab(y: number): void {
    this.hand = { at: performance.now(), moved: 0, velocity: 0, y };
  }

  drag(y: number): boolean {
    const hand = this.hand;
    if (!hand) return false;
    const now = performance.now();
    const dy = y - hand.y;
    const dt = Math.max(1, now - hand.at) / 1000;
    hand.moved += Math.abs(dy);
    hand.velocity = approach(hand.velocity, (-dy * DRAG) / dt, 0.08, dt);
    hand.y = y;
    hand.at = now;
    if (hand.moved <= CLICK_SLOP) return false;
    this.flying = false;
    this.target -= dy * DRAG;
    this.loop.wake();
    return true;
  }

  // Ends a press; a press that barely moved is a tap and returns true.
  drop(): boolean {
    const hand = this.hand;
    this.hand = null;
    if (!hand) return false;
    if (hand.moved <= CLICK_SLOP) return true;
    if (!this.reduced) this.target += hand.velocity * FLING_S;
    this.loop.wake();
    return false;
  }

  // The film under the pointer, or -1 over the floor, ceiling or fog.
  filmAt(x: number, y: number): number {
    const slot = this.slotAt(x, y);
    return slot ? slot.film : -1;
  }

  // A tap on a poster chooses it; a tap on the chosen one asks to open it.
  tap(x: number, y: number): { film: number; open: boolean } | null {
    const slot = this.slotAt(x, y);
    if (!slot) return null;
    if (slot.slot === this.chosen) return { film: slot.film, open: true };
    this.choose(slot.slot);
    return { film: slot.film, open: false };
  }

  dispose(): void {
    this.disposed = true;
    this.loop.dispose();
    this.abort.abort();
    clearTimeout(this.patience);
    if (this.sharpTimer) clearTimeout(this.sharpTimer);
    const gl = this.gl;
    for (const print of this.prints) if (print) gl.deleteTexture(print.texture);
    gl.deleteTexture(this.labelTexture);
    for (const buffer of this.buffers) gl.deleteBuffer(buffer);
    gl.deleteVertexArray(this.shellVao);
    gl.deleteVertexArray(this.posterVao);
    gl.deleteProgram(this.shell);
    gl.deleteProgram(this.poster);
  }

  private attribute(
    program: WebGLProgram,
    name: string,
    data: Float32Array,
    size: number,
  ): void {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    if (buffer) this.buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    if (location < 0) return;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  private sample(min: number): void {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // Slot n runs down the left wall's column, then the right's; slot 0 is
  // No. 100 and the countdown repeats forever in both directions.
  private filmOf(slot: number): number {
    return this.count - 1 - wrap(slot, this.count);
  }

  private columnOf(slot: number): number {
    return Math.floor(slot / PER_COLUMN);
  }

  private standFor(slot: number): number {
    return this.columnOf(slot) + 0.5 - VIEW_DISTANCE / CELL_W;
  }

  private choose(slot: number): void {
    if (slot !== this.chosen) {
      this.chosen = slot;
      this.chosenMix = this.reduced ? 1 : 0;
      this.events.selected(this.filmOf(slot));
    }
    this.flying = true;
    this.target = this.standFor(slot);
    this.sharpLater();
    this.loop.wake();
  }

  private tanY(): number {
    const aspect = this.width / this.height;
    return Math.max(Math.tan(FOV_Y / 2), Math.tan(FOV_X_MIN / 2) / aspect);
  }

  private eye(): [number, number, number] {
    return [this.sway.x, this.sway.y, -this.pos * CELL_W];
  }

  private slotAt(x: number, y: number): Slot | null {
    const cssWidth = this.width / this.ratio;
    const cssHeight = this.height / this.ratio;
    if (cssWidth <= 0 || cssHeight <= 0) return null;
    const tanY = this.tanY();
    const aspect = this.width / this.height;
    const dx = ((x / cssWidth) * 2 - 1) * tanY * aspect;
    const dy = (1 - (y / cssHeight) * 2) * tanY;
    if (Math.abs(dx) < 1e-6) return null;
    const [ex, ey, ez] = this.eye();
    const side = dx < 0 ? 0 : 1;
    const t = ((side === 0 ? -HALF_W : HALF_W) - ex) / dx;
    const hy = ey + dy * t;
    const hz = ez - t;
    if (t <= 0 || Math.abs(hy) >= HALF_H || t > FOG.end) return null;
    const column = Math.floor(-hz / CELL_W);
    const row = Math.min(ROWS - 1, Math.floor((HALF_H - hy) / CELL_H));
    const slot = column * PER_COLUMN + side * ROWS + row;
    return { film: this.filmOf(slot), slot };
  }

  private open(): void {
    if (this.opened || this.disposed) return;
    this.opened = true;
    if (this.reduced) this.reveal = 1;
    this.loop.wake();
  }

  // The nearest films load first, counted from the choice outwards.
  private pump(): void {
    const from = wrap(this.chosen ?? this.origin, this.count);
    while (this.loading.size < LOADS) {
      let next = -1;
      for (let away = 0; away < this.count && next < 0; away += 1) {
        for (const order of [from + away, from - away]) {
          const film = this.filmOf(order);
          if (
            !this.prints[film] &&
            !this.loading.has(film) &&
            !this.failed.has(film)
          ) {
            next = film;
            break;
          }
        }
      }
      if (next < 0) return;
      void this.load(next, false);
    }
  }

  private async load(film: number, sharp: boolean): Promise<void> {
    const pending = sharp ? this.sharpLoading : this.loading;
    pending.add(film);
    const src = tmdbImageUrl(
      "poster",
      this.films[film]!.posterPath,
      sharp ? "w780" : "w342",
    );
    const size = sharp ? SHARP : BASE;
    const bitmap = src
      ? await loadBitmap(src, {
          height: size.height,
          signal: this.abort.signal,
          width: size.width,
        })
      : null;
    pending.delete(film);
    if (this.disposed) {
      bitmap?.close();
      return;
    }
    if (bitmap) {
      this.upload(film, bitmap, sharp);
      bitmap.close();
    } else if (!sharp) {
      this.failed.add(film);
    }
    if (!sharp && !this.opened) {
      this.loaded += 1;
      if (this.loaded >= Math.min(OPEN_READY, this.count)) this.open();
    }
    if (!sharp) this.pump();
    this.loop.wake();
  }

  private upload(film: number, bitmap: ImageBitmap, sharp: boolean): void {
    const gl = this.gl;
    const held = this.prints[film];
    if (held?.sharp && !sharp) return;
    const texture = held?.texture ?? gl.createTexture();
    if (!texture) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.sample(gl.LINEAR_MIPMAP_LINEAR);
    if (this.anisotropic && this.anisotropy > 0) {
      gl.texParameterf(
        gl.TEXTURE_2D,
        this.anisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
        this.anisotropy,
      );
    }
    this.prints[film] = { at: held?.at ?? this.time, sharp, texture };
    if (sharp) this.trimSharp();
  }

  // Sharp prints go back to the base size once too many are held.
  private trimSharp(): void {
    const keep = new Set(this.nearFilms());
    if (this.chosen !== null) keep.add(this.filmOf(this.chosen));
    if (this.hovered !== null) keep.add(this.filmOf(this.hovered));
    let held = this.prints.filter((print) => print?.sharp).length;
    for (let film = 0; film < this.count && held > SHARP.kept; film += 1) {
      const print = this.prints[film];
      if (!print?.sharp || keep.has(film)) continue;
      // The sharp print stays up until the base one replaces it.
      this.prints[film] = { ...print, sharp: false };
      held -= 1;
      void this.load(film, false);
    }
  }

  private nearFilms(): number[] {
    const first = Math.floor(this.pos);
    const out: number[] = [];
    for (let column = first; column <= first + SHARP.reach; column += 1) {
      for (let i = 0; i < PER_COLUMN; i += 1) {
        out.push(this.filmOf(column * PER_COLUMN + i));
      }
    }
    return out;
  }

  private sharpLater(): void {
    if (this.sharpTimer) clearTimeout(this.sharpTimer);
    this.sharpTimer = setTimeout(() => {
      const wanted = this.nearFilms();
      if (this.chosen !== null) wanted.unshift(this.filmOf(this.chosen));
      if (this.hovered !== null) wanted.unshift(this.filmOf(this.hovered));
      for (const film of new Set(wanted)) {
        const print = this.prints[film];
        if (!print || print.sharp || this.sharpLoading.has(film)) continue;
        if (this.sharpLoading.size >= LOADS) break;
        void this.load(film, true);
      }
    }, SHARP.waitMs);
  }

  private paintLabel(slot: number): void {
    const gl = this.gl;
    const film = this.films[this.filmOf(slot)]!;
    const ctx = this.labelCanvas.getContext("2d");
    if (!ctx) return;
    const { height, width } = LABEL;
    const [r, g, b] = this.ink.map((value) => Math.round(value * 255));
    const ink = (alpha: number) => `rgb(${r} ${g} ${b} / ${alpha})`;
    const pad = width * 0.075;
    ctx.clearRect(0, 0, width, height);
    const shade = ctx.createLinearGradient(0, height * 0.42, 0, height);
    shade.addColorStop(0, "rgb(0 0 0 / 0)");
    shade.addColorStop(1, "rgb(0 0 0 / 0.86)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, height * 0.42, width, height * 0.58);

    ctx.textBaseline = "alphabetic";
    let y = height - pad;
    ctx.fillStyle = ink(0.62);
    ctx.font = `500 ${Math.round(width * 0.058)}px ${this.fonts.body}`;
    const meta = [film.year, film.rating ? `${film.rating.toFixed(1)}` : null]
      .filter(Boolean)
      .join("  ·  ");
    ctx.fillText(meta, pad, y);
    y -= width * 0.085;

    ctx.fillStyle = ink(1);
    const titleSize = Math.round(width * 0.16);
    ctx.font = `700 ${titleSize}px ${this.fonts.display}`;
    const lines = this.wrapTitle(
      ctx,
      film.title.toUpperCase(),
      width - pad * 2,
    );
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      ctx.fillText(lines[i]!, pad, y);
      y -= titleSize * 0.88;
    }

    ctx.fillStyle = ink(0.62);
    ctx.font = `500 ${Math.round(width * 0.058)}px ${this.fonts.body}`;
    ctx.fillText(`No. ${film.rank}`, pad, y - width * 0.01);

    gl.bindTexture(gl.TEXTURE_2D, this.labelTexture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.labelCanvas,
    );
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.sample(gl.LINEAR_MIPMAP_LINEAR);
    this.labelSlot = slot;
  }

  private wrapTitle(
    ctx: CanvasRenderingContext2D,
    title: string,
    room: number,
  ): string[] {
    const words = title.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= room || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) return lines;
    let last = lines.slice(1).join(" ");
    while (last.length > 1 && ctx.measureText(`${last}…`).width > room) {
      last = last.slice(0, -1).trimEnd();
    }
    return [lines[0]!, `${last}…`];
  }

  private frame(_now: number, rawDelta: number): boolean {
    if (this.disposed) return false;
    const dt = Math.min(rawDelta, 0.05);
    this.time += dt;
    let moving = false;

    const rate = this.flying ? RATE.fly : RATE.free;
    const before = this.pos;
    this.pos = this.reduced
      ? this.target
      : approach(this.pos, this.target, rate, dt);
    if (Math.abs(this.target - this.pos) < 1e-4) this.pos = this.target;
    else moving = true;
    if (Math.floor(before) !== Math.floor(this.pos)) this.sharpLater();

    const pointer = this.pointer;
    const swayTo = {
      x:
        pointer && !this.reduced
          ? ((pointer.x / (this.width / this.ratio)) * 2 - 1) * SWAY.x
          : 0,
      y:
        pointer && !this.reduced
          ? -((pointer.y / (this.height / this.ratio)) * 2 - 1) * SWAY.y
          : 0,
    };
    for (const axis of ["x", "y"] as const) {
      const next = this.reduced
        ? swayTo[axis]
        : approach(this.sway[axis], swayTo[axis], RATE.sway, dt);
      this.sway[axis] =
        Math.abs(next - swayTo[axis]) < 1e-4 ? swayTo[axis] : next;
      if (this.sway[axis] !== swayTo[axis]) moving = true;
    }

    const under =
      pointer && !this.hand?.moved ? this.slotAt(pointer.x, pointer.y) : null;
    const hovered = under && this.prints[under.film] ? under.slot : null;
    if (hovered !== this.hovered) {
      this.hovered = hovered;
      if (hovered !== null) this.sharpLater();
    }
    if (hovered !== null && !this.pops.has(hovered)) this.pops.set(hovered, 0);
    for (const [slot, mix] of this.pops) {
      const to = slot === hovered ? 1 : 0;
      const next = this.reduced ? to : approach(mix, to, RATE.hover, dt);
      if (Math.abs(next - to) < 1e-3) {
        if (to === 0) this.pops.delete(slot);
        else this.pops.set(slot, 1);
      } else {
        this.pops.set(slot, next);
        moving = true;
      }
    }
    const dimTo = hovered !== null ? 1 : 0;
    this.hoverMix = this.reduced
      ? dimTo
      : approach(this.hoverMix, dimTo, RATE.hover, dt);
    if (Math.abs(this.hoverMix - dimTo) < 1e-3) this.hoverMix = dimTo;
    else moving = true;

    if (this.chosenMix < 1) {
      this.chosenMix = Math.min(1, this.chosenMix + dt / RATE.hover);
      moving = true;
    }
    if (this.opened && this.reveal < 1) {
      this.reveal = Math.min(1, this.reveal + dt / REVEAL_S);
      moving = true;
    }
    if (hovered !== null && hovered !== this.labelSlot)
      this.paintLabel(hovered);

    moving = this.draw() || moving;
    return moving;
  }

  // Draws one frame; true while a poster is still fading in.
  private draw(): boolean {
    const gl = this.gl;
    const { height, width } = this;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.opened) return false;

    const [ex, ey, ez] = this.eye();
    const tanY = this.tanY();
    const f = 1 / tanY;
    const aspect = width / height;
    const a = (FAR + NEAR) / (NEAR - FAR);
    const b = (2 * FAR * NEAR) / (NEAR - FAR);
    // Perspective times a translation by -eye, column-major.
    const viewProj = new Float32Array([
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      a,
      -1,
      (-ex * f) / aspect,
      -ey * f,
      -ez * a + b,
      ez,
    ]);
    const reveal = smooth(this.reveal);
    const line = Math.max(1, this.ratio);
    const fog = [FOG.start, FOG.end] as const;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    gl.useProgram(this.shell);
    gl.bindVertexArray(this.shellVao);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    const s = this.shellAt;
    gl.uniformMatrix4fv(s.uViewProj, false, viewProj);
    gl.uniform2f(s.uSpan, ez + 1, ez - FAR);
    gl.uniform3f(s.uInk, ...this.ink);
    gl.uniform3f(s.uCell, CELL_W, CELL_H, ROWS);
    gl.uniform1f(s.uEyeZ, ez);
    gl.uniform2f(s.uFog, ...fog);
    gl.uniform1f(s.uLine, line);
    gl.uniform1f(s.uAlpha, LINE_ALPHA * reveal);
    gl.drawArrays(gl.TRIANGLES, 0, 24);

    gl.useProgram(this.poster);
    gl.bindVertexArray(this.posterVao);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    const p = this.posterAt;
    gl.uniformMatrix4fv(p.uViewProj, false, viewProj);
    gl.uniform2f(p.uSize, CELL_W * POSTER_FILL, CELL_H * POSTER_FILL);
    gl.uniform3f(p.uShape, POP.grow, POP.lift, POP.turn);
    gl.uniform1f(p.uEyeZ, ez);
    gl.uniform3f(p.uInk, ...this.ink);
    gl.uniform2f(p.uFog, ...fog);
    gl.uniform1f(p.uLine, line);
    gl.uniform1i(p.uTex, 0);
    gl.uniform1i(p.uLabelTex, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.labelTexture);
    gl.activeTexture(gl.TEXTURE0);

    let fading = false;
    const first = Math.floor(this.pos);
    const popped: number[] = [];
    // Far to near, so a lifted poster always lands over its neighbours.
    for (let column = first + AHEAD; column >= first; column -= 1) {
      for (let i = 0; i < PER_COLUMN; i += 1) {
        const slot = column * PER_COLUMN + i;
        if (this.pops.has(slot)) {
          popped.push(slot);
          continue;
        }
        fading = this.drawPoster(slot, reveal) || fading;
      }
    }
    for (const slot of popped) fading = this.drawPoster(slot, reveal) || fading;
    gl.bindVertexArray(null);
    return fading;
  }

  private drawPoster(slot: number, reveal: number): boolean {
    const gl = this.gl;
    const film = this.filmOf(slot);
    const print = this.prints[film];
    if (!print) return false;
    const p = this.posterAt;
    const column = this.columnOf(slot);
    const within = slot - column * PER_COLUMN;
    const side = within < ROWS ? 1 : -1;
    const row = within % ROWS;
    const pop = smooth(this.pops.get(slot) ?? 0);
    const chosen = slot === this.chosen ? smooth(this.chosenMix) : 0;
    const rest = SHADE.rest + (SHADE.selected - SHADE.rest) * chosen;
    const dimmed = rest + (SHADE.dim - rest) * this.hoverMix;
    const shade = dimmed + (SHADE.hover - dimmed) * pop;
    const fade = this.reduced
      ? 1
      : Math.min(1, (this.time - print.at) / FADE_IN_S);

    gl.uniform3f(
      p.uCenter,
      side > 0 ? -HALF_W : HALF_W,
      HALF_H - (row + 0.5) * CELL_H,
      -(column + 0.5) * CELL_W,
    );
    gl.uniform1f(p.uSide, side);
    gl.uniform1f(p.uPop, pop);
    gl.uniform1f(p.uLift, REST_OFFSET + SELECTED_LIFT * chosen);
    gl.uniform1f(p.uShade, shade);
    gl.uniform1f(p.uAlpha, smooth(fade) * reveal);
    gl.uniform1f(p.uLabel, slot === this.labelSlot ? pop : 0);
    gl.uniform1f(p.uEdge, LINE_ALPHA * (1 - pop) * (1 - chosen));
    gl.bindTexture(gl.TEXTURE_2D, print.texture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return fade < 1;
  }
}
