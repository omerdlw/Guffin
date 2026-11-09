import { tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  bindFullscreen,
  createProgram,
  createTexture,
  fitCanvas,
  sampleClamped,
  uniforms,
} from "@/motion/render";
import {
  MAX_PRINTS,
  WALL_ARRIVE_S,
  WALL_BULGE,
  WALL_CLICK_SLOP,
  WALL_GLIDE_S,
  WALL_IN_FLIGHT,
  WALL_INERTIA,
  WALL_LAMP_S,
  WALL_LENS,
  WALL_LOUPE,
  WALL_LOUPE_FADE_S,
  WALL_LOUPE_WAIT_MS,
  WALL_MIP_EVERY_MS,
  WALL_NUMBERS_S,
  WALL_OPEN_PATIENCE_MS,
  WALL_OPEN_READY,
  WALL_RADIUS,
  WALL_UNIFORMS,
  WALL_UNIT,
  WALL_WAVE_AT,
  WALL_WAVE_S,
  WALL_WHEEL_S,
} from "./constants";
import { createLoop, loadBitmap } from "./gl";
import type {
  CanonFilm,
  FilmMarks,
  Loop,
  LoopFactory,
  Vec2,
  WallEvents,
  WallLook,
  WallViewport,
} from "./types";
import { approach, filmAt, nearestCopy, pitches, wallAt } from "./utils";

const WALL_FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform float uPitch;
uniform vec2 uPan;
uniform vec2 uFocus;
uniform float uLens;
uniform float uRadius;
uniform float uBulge;
uniform vec3 uLamp;

uniform sampler2DArray uPrints;
uniform vec4 uState[${MAX_PRINTS}];
uniform float uRank[${MAX_PRINTS}];
uniform float uCount;
uniform float uMarks;
uniform float uSelected;
uniform float uOpen;
uniform float uNumbers;
uniform float uTime;

uniform sampler2D uLoupe;
uniform float uLoupeIndex;
uniform float uLoupeMix;
uniform sampler2D uDigits;

const float COLUMNS = 10.0;
const float GAP = 0.2;
const float RATIO = 2.0 / 3.0;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

vec3 shoulder(vec3 c) {
  float peak = max(max(c.r, c.g), c.b);
  const float K = 0.8;
  if (peak <= K) return c;
  float m = K + (1.0 - K) * (1.0 - exp(-(peak - K) / (1.0 - K)));
  return c * (m / peak);
}

void main() {
  vec2 px = vUv * uRes;
  vec2 c = (px - 0.5 * uRes) / uRes.y;

  vec2 d = c - uFocus;
  float g = exp(-dot(d, d) / (uRadius * uRadius));
  vec2 l = uFocus + d * (1.0 - uLens * g);
  vec2 b = l * (1.0 + uBulge * dot(l, l));

  float inner = uPitch * (1.0 - GAP);
  vec2 size = vec2(inner * RATIO, inner);
  vec2 pitch = vec2(size.x + uPitch * GAP, uPitch);
  vec2 wall = b * uRes.y / pitch + uPan;
  vec2 wx = dFdx(wall) * pitch;
  vec2 wy = dFdy(wall) * pitch;
  float aa = max(length(vec2(wx.x, wy.x)), 1e-3);

  vec2 cell = floor(wall);
  vec2 q = (wall - cell - 0.5) * pitch;
  float index = mod(cell.y * COLUMNS + cell.x, max(uCount, 1.0));
  int at = int(index);
  vec4 state = uState[at];
  float loaded = state.x;
  float seen = state.y;
  float lift = state.z;
  float match = state.w;
  float picked = 1.0 - step(0.5, abs(index - uSelected));

  vec2 home = (cell + 0.5 - uPan) * pitch / uRes.y;
  float arrive = clamp((uOpen * 1.7 - length(home * vec2(0.9, 1.1))) / 0.32, 0.0, 1.0);
  arrive = arrive * arrive * (3.0 - 2.0 * arrive);

  vec2 toLamp = c - uLamp.xy;
  float pool = exp(-dot(toLamp, toLamp) / 0.13) * uLamp.z;
  float light = 0.15 + 0.85 * pool;

  vec2 half_ = size * 0.5 * (1.0 + 0.045 * lift) * mix(0.95, 1.0, arrive) * mix(0.93, 1.0, match);
  float sd = roundedBox(q, half_, 0.0);
  float card = 1.0 - smoothstep(-aa, aa, sd);

  vec2 uv = clamp(q / (2.0 * half_) + 0.5, 0.0, 1.0);
  vec2 gx = wx / (2.0 * half_);
  vec2 gy = wy / (2.0 * half_);
  vec3 print = textureGrad(uPrints, vec3(uv, index), gx, gy).rgb;
  if (abs(index - uLoupeIndex) < 0.5) {
    print = mix(print, textureGrad(uLoupe, uv, gx, gy).rgb, uLoupeMix);
  }
  vec3 linear = pow(print, vec3(2.2)) * loaded;

  float lit = max(light, max(picked * 0.85, lift * 0.95));
  float grey = dot(linear, LUMA);
  vec3 face = mix(vec3(grey) * vec3(0.9, 0.94, 1.0), linear, smoothstep(0.2, 0.7, lit));
  face *= lit * arrive * mix(0.07, 1.0, match);
  face += vec3(1.0, 0.96, 0.9) * exp(-dot(toLamp, toLamp) / 0.0025) * 0.05 * uLamp.z * arrive * match;

  float badge = size.x * 0.075;
  vec2 mark = q - vec2(half_.x - badge * 1.7, -half_.y + badge * 1.7);
  float disc = length(mark) - badge;
  float marks = uMarks * match * arrive;
  float discMask = (1.0 - smoothstep(-aa, aa, disc)) * marks * seen;
  vec2 t = mark / badge;
  float tick = min(segment(t, vec2(-0.42, 0.02), vec2(-0.1, 0.32)), segment(t, vec2(-0.1, 0.32), vec2(0.45, -0.3)));
  float tickMask = 1.0 - smoothstep(0.1, 0.1 + aa / badge * 1.5, tick);
  face = mix(face, mix(vec3(0.9), vec3(0.02), tickMask) * max(lit, 0.6), discMask);

  vec3 color = face * card;

  vec3 mean = pow(textureLod(uPrints, vec3(0.5, 0.5, index), 9.0).rgb, vec3(2.2)) * loaded;
  float halo = exp(-max(sd, 0.0) / (size.x * 0.02)) * (1.0 - card);
  color += mean * halo * picked * arrive * 0.3;

  float rank = uRank[at];
  float digits = rank < 99.5 ? 2.0 : 3.0;
  float th = uPitch * GAP * 0.36;
  vec2 glyph = vec2(th * 0.6, th);
  vec2 lp = q - vec2(-size.x * 0.5, size.y * 0.5 + uPitch * GAP * 0.08);
  float slot = floor(lp.x / glyph.x);
  if (lp.x >= 0.0 && lp.y >= 0.0 && lp.y <= glyph.y && slot < digits) {
    float value = mod(floor(rank / pow(10.0, digits - 1.0 - slot) + 0.001), 10.0);
    vec2 duv = vec2((value + fract(lp.x / glyph.x)) / 10.0, lp.y / glyph.y);
    float ink = textureGrad(uDigits, duv, wx / glyph / vec2(10.0, 1.0), wy / glyph / vec2(10.0, 1.0)).r;
    color += vec3(ink) * (0.12 + 0.55 * pool + 0.3 * picked) * uNumbers * match * arrive;
  }

  color = shoulder(color);
  color *= mix(0.3, 1.0, smoothstep(1.15, 0.25, length(c * vec2(0.82, 1.0))));
  color = pow(max(color, 0.0), vec3(1.0 / 2.2));
  float grain = hash(floor(px / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * 0.05 * dot(color, vec3(0.3333));
  outColor = vec4(max(color, 0.0), 1.0);
}`;

export class Wall {
  private readonly loop: Loop;
  private readonly u;
  private readonly prints: WebGLTexture;
  private readonly loupe: WebGLTexture;
  private readonly digits: WebGLTexture;
  private readonly state = new Float32Array(MAX_PRINTS * 4);
  private readonly rank = new Float32Array(MAX_PRINTS);
  private readonly count: number;
  private readonly cell: { height: number; width: number };
  private readonly arrived: number[];
  private readonly looks: WallLook[];
  private readonly queue: number[];
  private flying = 0;
  private loaded = 0;
  private dirtySince = 0;
  private marks: FilmMarks[] | null = null;
  private loupeAt = -1;
  private loupeWant = { at: 0, index: -1 };
  private loupeMix = 0;
  private loupeAbort: AbortController | null = null;

  private width = 1;
  private height = 1;
  private pitch = 1;
  private offset: Vec2 = [0, 0];
  private velocity: Vec2 = [0, 0];
  private pending: Vec2 = [0, 0];
  private glide: Vec2 | null = null;
  private hand: { at: number; x: number; y: number } | null = null;
  private held: { at: number; moved: number; x: number; y: number } | null =
    null;
  private focus: Vec2 = [0, 0];
  private lampAt: Vec2 = [0, 0];
  private lens = WALL_LENS.rest;
  private hover = -1;
  private selected = 0;

  private readonly born = performance.now();
  private lamp = 0;
  private open = 0;
  private numbers = 0;
  private started = false;
  private opened = false;
  private reduced = false;
  private disposed = false;

  static create(
    canvas: HTMLCanvasElement,
    films: readonly CanonFilm[],
    events: WallEvents,
    loop: LoopFactory = createLoop,
  ): Wall | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    if (!gl) return null;
    const program = createProgram(gl, WALL_FRAGMENT);
    if (!program) return null;
    return new Wall(canvas, gl, program, films, events, loop);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    private readonly program: WebGLProgram,
    private readonly films: readonly CanonFilm[],
    private readonly events: WallEvents,
    loop: LoopFactory,
  ) {
    this.count = Math.min(MAX_PRINTS, films.length);
    gl.useProgram(program);
    bindFullscreen(gl, program);
    this.u = uniforms(gl, program, WALL_UNIFORMS);
    gl.uniform1i(this.u.uPrints, WALL_UNIT.prints);
    gl.uniform1i(this.u.uLoupe, WALL_UNIT.loupe);
    gl.uniform1i(this.u.uDigits, WALL_UNIT.digits);
    films.slice(0, this.count).forEach((film, i) => {
      this.rank[i] = film.rank;
    });

    const small = Math.max(window.innerWidth, window.innerHeight) < 900;
    this.cell = small
      ? { height: 300, width: 200 }
      : { height: 420, width: 280 };
    const levels =
      Math.floor(Math.log2(Math.max(this.cell.width, this.cell.height))) + 1;
    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.prints);
    this.prints = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    gl.texStorage3D(
      gl.TEXTURE_2D_ARRAY,
      levels,
      gl.RGBA8,
      this.cell.width,
      this.cell.height,
      Math.max(1, this.count),
    );
    sampleClamped(gl, gl.LINEAR_MIPMAP_LINEAR, gl.TEXTURE_2D_ARRAY);

    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.loupe);
    this.loupe = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
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
    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.digits);
    this.digits = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
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
    gl.activeTexture(gl.TEXTURE0);
    void this.cutDigits();

    this.arrived = films.map(() => Number.NaN);
    this.looks = films.map(() => ({ lift: 0, match: 1, seen: 0 }));
    this.queue = Array.from({ length: this.count }, (_, i) => i);
    this.pump();
    this.loop = loop((now, dt) => this.frame(now, dt));
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.loop.wake();
  }

  setMarks(marks: FilmMarks[] | null): void {
    this.marks = marks;
    this.loop.wake();
  }

  select(index: number, glide = true): void {
    this.selected = index;
    if (glide) {
      const at = this.view().pan;
      const to = nearestCopy(index, at, this.count);
      const goal: Vec2 = [
        this.offset[0] + to[0] - at[0],
        this.offset[1] + to[1] - at[1],
      ];
      this.velocity = [0, 0];
      this.pending = [0, 0];
      if (this.reduced) this.offset = goal;
      else this.glide = goal;
    }
    this.loop.wake();
  }

  point(x: number | null, y: number | null): void {
    this.hand =
      x === null || y === null ? null : { at: performance.now(), x, y };
    this.loop.wake();
  }

  grab(x: number, y: number): void {
    this.held = { at: performance.now(), moved: 0, x, y };
    this.glide = null;
    this.velocity = [0, 0];
    this.pending = [0, 0];
    this.loop.wake();
  }

  drag(x: number, y: number): void {
    const held = this.held;
    if (!held) return;
    const now = performance.now();
    const dt = (now - held.at) / 1000;
    const view = this.view();
    const from = wallAt(view, held.x, held.y);
    const to = wallAt(view, x, y);
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    this.offset[0] -= dx;
    this.offset[1] -= dy;
    const step = Math.max(dt, 1 / 240);
    this.velocity = [
      approach(this.velocity[0], -dx / step, 0.08, step),
      approach(this.velocity[1], -dy / step, 0.08, step),
    ];
    held.moved += Math.hypot(x - held.x, y - held.y);
    held.at = now;
    held.x = x;
    held.y = y;
    this.loop.wake();
  }

  drop(): boolean {
    const held = this.held;
    this.held = null;
    if (!held) return false;
    const click = held.moved < WALL_CLICK_SLOP;
    const still = performance.now() - held.at > 90;
    if (click || still || this.reduced) this.velocity = [0, 0];
    this.loop.wake();
    return click;
  }

  scroll(dx: number, dy: number): void {
    const [px, py] = pitches(this.pitch);
    this.glide = null;
    this.velocity = [0, 0];
    this.pending[0] += dx / px;
    this.pending[1] += dy / py;
    if (this.reduced) {
      this.offset[0] += this.pending[0];
      this.offset[1] += this.pending[1];
      this.pending = [0, 0];
    }
    this.loop.wake();
  }

  filmAt(x: number, y: number): number {
    return filmAt(wallAt(this.view(), x, y), this.count);
  }

  dispose(): void {
    this.disposed = true;
    this.loop.dispose();
    this.loupeAbort?.abort();
    const gl = this.gl;
    gl.deleteTexture(this.prints);
    gl.deleteTexture(this.loupe);
    gl.deleteTexture(this.digits);
    gl.deleteProgram(this.program);
  }

  private view(): WallViewport {
    return {
      bulge: WALL_BULGE,
      focus: this.focus,
      height: this.height,
      lens: this.lens,
      pan: [0.5 + this.offset[0], 0.5 + this.offset[1]],
      pitch: this.pitch,
      radius: WALL_RADIUS,
      width: this.width,
    };
  }

  private pump(): void {
    while (this.flying < WALL_IN_FLIGHT && this.queue.length > 0) {
      const index = this.queue.shift()!;
      this.flying += 1;
      void this.load(index).finally(() => {
        this.flying -= 1;
        if (!this.disposed) this.pump();
      });
    }
  }

  private async load(index: number): Promise<void> {
    const src = tmdbImageUrl("poster", this.films[index]!.posterPath, "w342");
    const bitmap = src ? await loadBitmap(src, this.cell) : null;
    if (!bitmap || this.disposed || this.gl.isContextLost()) {
      bitmap?.close();
      return;
    }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.prints);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      0,
      0,
      index,
      this.cell.width,
      this.cell.height,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bitmap,
    );
    bitmap.close();
    this.dirtySince ||= performance.now();
    this.arrived[index] = Number.POSITIVE_INFINITY;
    this.loaded += 1;
    this.loop.wake();
  }

  private async cutDigits(): Promise<void> {
    const family = getComputedStyle(document.body).fontFamily;
    const face = `600 76px ${family}`;
    await document.fonts.load(face, "0123456789").catch(() => undefined);
    if (this.disposed) return;
    const cell = { height: 96, width: 58 };
    const canvas = new OffscreenCanvas(cell.width * 10, cell.height);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.font = face;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let digit = 0; digit < 10; digit += 1) {
      context.fillText(
        String(digit),
        cell.width * (digit + 0.5),
        cell.height * 0.54,
      );
    }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.digits);
    gl.bindTexture(gl.TEXTURE_2D, this.digits);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0);
    this.loop.wake();
  }

  private fetchLoupe(now: number): void {
    const { at, index } = this.loupeWant;
    if (index === this.loupeAt || index < 0 || this.loupeAbort) return;
    if (now - at < WALL_LOUPE_WAIT_MS) return;
    const src = tmdbImageUrl("poster", this.films[index]!.posterPath, "w780");
    if (!src) return;
    const abort = new AbortController();
    this.loupeAbort = abort;
    void loadBitmap(src, { ...WALL_LOUPE, signal: abort.signal }).then(
      (bitmap) => {
        if (this.loupeAbort === abort) this.loupeAbort = null;
        if (!bitmap || this.disposed || this.gl.isContextLost()) {
          bitmap?.close();
          return;
        }
        if (this.loupeWant.index === index) {
          const gl = this.gl;
          gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.loupe);
          gl.bindTexture(gl.TEXTURE_2D, this.loupe);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            bitmap,
          );
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.activeTexture(gl.TEXTURE0);
          this.loupeAt = index;
          this.loupeMix = 0;
        }
        bitmap.close();
        this.loop.wake();
      },
    );
  }

  private frame(now: number, dt: number): boolean {
    const gl = this.gl;
    if (gl.isContextLost()) return false;
    fitCanvas(this.canvas, 2);
    this.width = Math.max(1, this.canvas.clientWidth);
    this.height = Math.max(1, this.canvas.clientHeight);
    this.pitch = this.height * (this.width / this.height < 0.9 ? 0.15 : 0.2);
    const ratio = this.canvas.width / this.width;
    const ms = now * 1000;
    const reduced = this.reduced;

    if (
      !this.started &&
      (this.loaded >= Math.min(this.count, WALL_OPEN_READY) ||
        performance.now() - this.born > WALL_OPEN_PATIENCE_MS)
    ) {
      this.started = true;
    }
    if (this.started) {
      this.lamp = reduced ? 1 : Math.min(1, this.lamp + dt / WALL_LAMP_S);
      if (this.lamp >= WALL_WAVE_AT) {
        this.open = reduced ? 1 : Math.min(1, this.open + dt / WALL_WAVE_S);
      }
      if (this.open >= 1) {
        this.numbers = reduced
          ? 1
          : Math.min(1, this.numbers + dt / WALL_NUMBERS_S);
      }
      if (!this.opened && this.numbers >= 1) {
        this.opened = true;
        this.events.opened();
      }
    }

    let moving = false;
    if (this.glide && !this.held) {
      const [gx, gy] = this.glide;
      this.offset = [
        approach(this.offset[0], gx, WALL_GLIDE_S, dt),
        approach(this.offset[1], gy, WALL_GLIDE_S, dt),
      ];
      if (Math.hypot(gx - this.offset[0], gy - this.offset[1]) < 0.001) {
        this.offset = [gx, gy];
        this.glide = null;
      }
      moving = true;
    } else if (!this.held) {
      const take = 1 - Math.exp(-dt / WALL_WHEEL_S);
      const step: Vec2 = [this.pending[0] * take, this.pending[1] * take];
      this.offset[0] += step[0] + this.velocity[0] * dt;
      this.offset[1] += step[1] + this.velocity[1] * dt;
      this.pending[0] -= step[0];
      this.pending[1] -= step[1];
      const decay = Math.exp(-WALL_INERTIA * dt);
      this.velocity = [this.velocity[0] * decay, this.velocity[1] * decay];
      if (Math.hypot(...this.velocity) < 0.01) this.velocity = [0, 0];
      if (Math.hypot(...this.pending) < 0.0005) this.pending = [0, 0];
      moving =
        this.velocity[0] !== 0 ||
        this.velocity[1] !== 0 ||
        this.pending[0] !== 0 ||
        this.pending[1] !== 0;
    }

    const hand = this.hand;
    const present = hand !== null && this.open >= 1 && !reduced;
    const aim: Vec2 = present
      ? [
          (hand.x - this.width / 2) / this.height,
          (hand.y - this.height / 2) / this.height,
        ]
      : [0, 0];
    this.focus = [
      approach(this.focus[0], aim[0], 0.45, dt),
      approach(this.focus[1], aim[1], 0.45, dt),
    ];
    this.lampAt = [
      approach(this.lampAt[0], aim[0], 1.3, dt),
      approach(this.lampAt[1], aim[1], 1.3, dt),
    ];
    this.lens = approach(
      this.lens,
      present ? WALL_LENS.near : WALL_LENS.rest,
      1.2,
      dt,
    );
    const view = this.view();

    const hover =
      hand && !this.held && this.opened
        ? filmAt(wallAt(view, hand.x, hand.y), this.count)
        : -1;
    if (hover !== this.hover) {
      this.hover = hover;
      this.events.hovered(hover);
    }

    let easing = false;
    const marks = this.marks;
    for (let i = 0; i < this.count; i += 1) {
      const look = this.looks[i]!;
      const lift = i === hover ? 1 : i === this.selected ? 0.55 : 0;
      const seen = marks?.[i]?.seen ? 1 : 0;
      const match = marks?.[i]?.match === false ? 0 : 1;
      look.lift = approach(look.lift, lift, 0.45, dt);
      look.seen = approach(look.seen, seen, 0.6, dt);
      look.match = approach(look.match, match, 0.7, dt);
      easing ||=
        Math.abs(look.lift - lift) > 0.002 ||
        Math.abs(look.match - match) > 0.002;
    }

    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.prints);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    if (this.dirtySince && ms - this.dirtySince > WALL_MIP_EVERY_MS) {
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      this.dirtySince = 0;
      this.arrived.forEach((at, i) => {
        if (at === Number.POSITIVE_INFINITY) this.arrived[i] = ms;
      });
    }
    let arriving = this.dirtySince !== 0;
    for (let i = 0; i < this.count; i += 1) {
      const at = this.arrived[i]!;
      const shown = Number.isFinite(at)
        ? Math.min(1, (ms - at) / 1000 / WALL_ARRIVE_S)
        : 0;
      arriving ||= Number.isFinite(at) && shown < 1;
      const look = this.looks[i]!;
      this.state.set([shown, look.seen, look.lift, look.match], i * 4);
    }

    const want = this.opened ? (hover >= 0 ? hover : this.selected) : -1;
    if (want !== this.loupeWant.index) {
      this.loupeWant = { at: performance.now(), index: want };
      if (this.loupeAt !== want) this.loupeMix = 0;
    }
    this.fetchLoupe(performance.now());
    const loupeHeld = this.loupeAt >= 0 && this.loupeAt === want;
    if (loupeHeld)
      this.loupeMix = Math.min(1, this.loupeMix + dt / WALL_LOUPE_FADE_S);
    const loupeWaiting =
      want >= 0 &&
      (!loupeHeld || this.loupeMix < 1) &&
      this.loupeAbort !== null;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    const u = this.u;
    const ease = (t: number) => t * t * (3 - 2 * t);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uPitch, this.pitch * ratio);
    gl.uniform2f(u.uPan, view.pan[0], view.pan[1]);
    gl.uniform2f(u.uFocus, this.focus[0], this.focus[1]);
    gl.uniform1f(u.uLens, this.lens);
    gl.uniform1f(u.uRadius, WALL_RADIUS);
    gl.uniform1f(u.uBulge, WALL_BULGE);
    gl.uniform3f(u.uLamp, this.lampAt[0], this.lampAt[1], ease(this.lamp));
    gl.uniform4fv(u.uState, this.state);
    gl.uniform1fv(u.uRank, this.rank);
    gl.uniform1f(u.uCount, this.count);
    gl.uniform1f(u.uMarks, marks ? 1 : 0);
    gl.uniform1f(u.uSelected, this.opened ? this.selected : -1);
    gl.uniform1f(u.uOpen, this.open);
    gl.uniform1f(u.uNumbers, ease(this.numbers));
    gl.uniform1f(u.uTime, reduced ? 0 : now);
    gl.uniform1f(u.uLoupeIndex, loupeHeld ? this.loupeAt : -1);
    gl.uniform1f(u.uLoupeMix, loupeHeld ? ease(this.loupeMix) : 0);
    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.loupe);
    gl.bindTexture(gl.TEXTURE_2D, this.loupe);
    gl.activeTexture(gl.TEXTURE0 + WALL_UNIT.digits);
    gl.bindTexture(gl.TEXTURE_2D, this.digits);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const chasing =
      Math.hypot(aim[0] - this.focus[0], aim[1] - this.focus[1]) > 1e-4 ||
      Math.hypot(aim[0] - this.lampAt[0], aim[1] - this.lampAt[1]) > 1e-4 ||
      Math.abs(this.lens - (present ? WALL_LENS.near : WALL_LENS.rest)) > 1e-4;
    const opening = !this.opened;
    return (
      opening ||
      moving ||
      chasing ||
      easing ||
      arriving ||
      loupeWaiting ||
      (loupeHeld && this.loupeMix < 1) ||
      this.held !== null
    );
  }
}
