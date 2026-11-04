import {
  bindFullscreen,
  createProgram,
  createTexture,
  fitCanvas,
  uniforms,
} from "@/motion/render";
import { clamp } from "@/motion/utils";
import {
  FOUNDRY_CAST_S,
  FOUNDRY_CUT_S,
  FOUNDRY_ENGRAVE_WIDTH,
  FOUNDRY_FILL_S,
  FOUNDRY_HEAT_S,
  FOUNDRY_LAMP_AT,
  FOUNDRY_LAMP_S,
  FOUNDRY_LOOK,
  FOUNDRY_MELT_S,
  FOUNDRY_POSTER,
  FOUNDRY_RAIL,
  FOUNDRY_REACH,
  FOUNDRY_REST_LIGHT,
  FOUNDRY_REVEAL_S,
  FOUNDRY_SET_S,
  FOUNDRY_TILT,
  FOUNDRY_UNIFORMS,
} from "./constants";
import { Bloom, createLoop, loadBitmap } from "./gl";
import type { FoundryEvents, FoundryPlate, Loop, LoopFactory } from "./types";
import { approach, smooth } from "./utils";

const FOUNDRY_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform vec4 uPlate;
uniform vec2 uTilt;
uniform vec3 uLight;
uniform float uTime;
uniform float uMelt;
uniform float uCool;
uniform float uHeat;
uniform float uLamp;
uniform float uReveal;
uniform float uFill;
uniform float uCut;
uniform sampler2D uPoster;
uniform sampler2D uEngrave;

const float BORDER = 0.085;
const float HEAD = 0.075;
const float RAIL = 0.13;
const float CUT = 0.0075;
const float CAMERA = 3.4;
const vec3 GOLD = vec3(0.86, 0.68, 0.40);
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + 17.1;
    amp *= 0.5;
  }
  return sum;
}

float box(vec2 p, vec2 half_) {
  vec2 d = abs(p) - half_;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

mat3 rotation(vec2 tilt) {
  float cy = cos(tilt.x), sy = sin(tilt.x);
  float cx = cos(tilt.y), sx = sin(tilt.y);
  mat3 yaw = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 pitch = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
  return yaw * pitch;
}

float frameAt(vec2 q) {
  float a = uPlate.w;
  return box(q - vec2(0.0, HEAD * 0.5), vec2(a + BORDER, 1.0 + BORDER + HEAD * 0.5)) - 0.02;
}

vec2 railAt(vec2 q) {
  float a = uPlate.w;
  return vec2(q.x / (2.0 * a) + 0.5, (1.0 + (BORDER + HEAD) * 0.5 + RAIL * 0.5 - q.y) / RAIL);
}

float burin() {
  return mix(0.2, 0.8, uCut);
}

float engraveAt(vec2 q) {
  float a = uPlate.w;
  vec2 t = railAt(q);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
  float lod = log2(float(textureSize(uEngrave, 0).x) / (2.0 * a * uPlate.z));
  float cut = smoothstep(burin() + 0.004, burin() - 0.004, t.x);
  return textureLod(uEngrave, t, max(lod, 0.0)).r * max(cut, step(1.0, uCut));
}

float surfaceAt(vec2 q) {
  return mix(-1.1, 1.1, uFill) + sin(q.x * 9.0 + uTime * 2.2) * 0.006
    + (fbm(vec2(q.x * 4.0, uTime * 0.6)) - 0.5) * 0.02;
}

vec2 posterUv(vec2 q) {
  float a = uPlate.w;
  return vec2(q.x / a * 0.5 + 0.5, 0.5 - q.y * 0.5);
}

float meltAt(vec2 q) {
  float n = fbm(q * 2.2 + vec2(0.0, uTime * 0.08));
  return clamp(uMelt * 2.1 - 0.55 + (n - 0.5) * 0.7 - q.y * 0.18, 0.0, 1.0);
}

float lightOf(vec2 uv, float lod) {
  return dot(textureLod(uPoster, uv, lod).rgb, LUMA);
}

float heightAt(vec2 q, float melt) {
  float a = uPlate.w;
  float outer = frameAt(q);
  float inner = box(q, vec2(a, 1.0));
  float frame = smoothstep(0.0, -BORDER * 0.7, outer) * 0.03;
  frame += exp(-pow(inner / 0.012, 2.0)) * 0.012;
  if (inner > 0.0) return frame - engraveAt(q) * CUT * (1.0 - uMelt);
  vec2 uv = posterUv(q);
  float broad = lightOf(uv, 3.2);
  float fine = lightOf(uv, 1.2);
  float relief = (broad * 0.5 + fine * 0.5) * 0.03 * (1.0 - melt);
  float ripple = (fbm(q * 7.0 + vec2(uTime * 0.6, -uTime * 0.4)) - 0.5) * 0.006 * melt;
  return frame + 0.006 + relief + ripple;
}

vec3 studio(vec3 r, float rough) {
  float spread = mix(0.05, 0.35, rough);
  float top = smoothstep(0.62 - spread, 0.78, r.y) * smoothstep(1.02 + spread, 0.86, r.y);
  top *= smoothstep(0.9 + spread, 0.2, abs(r.x + 0.25));
  float side = smoothstep(0.55 - spread, 0.8, -r.x) * smoothstep(0.75 + spread, 0.1, abs(r.y - 0.1));
  float horizon = exp(-abs(r.y + 0.08) * 5.0);
  vec3 env = vec3(0.01, 0.008, 0.007);
  env += vec3(1.0, 0.95, 0.9) * top * 1.1;
  env += vec3(0.85, 0.9, 1.0) * side * 0.45;
  env += vec3(0.8, 0.55, 0.32) * horizon * 0.12;
  return env;
}

vec3 blackbody(float t) {
  vec3 ember = vec3(0.9, 0.12, 0.015);
  vec3 orange = vec3(1.9, 0.62, 0.1);
  vec3 white = vec3(2.8, 2.0, 1.1);
  vec3 c = mix(ember, orange, smoothstep(0.0, 0.65, t));
  c = mix(c, white, smoothstep(0.75, 1.0, t));
  return c * smoothstep(0.0, 0.3, t);
}

float ggx(float nh, float rough) {
  float a = rough * rough;
  float a2 = a * a;
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159 * d * d + 1e-5);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - uPlate.xy) / uPlate.z;
  mat3 rot = rotation(uTilt);
  vec3 eye = vec3(0.0, 0.0, CAMERA);
  vec3 dir = normalize(vec3(p, -CAMERA));
  vec3 normal = rot * vec3(0.0, 0.0, 1.0);
  float t = -dot(eye, normal) / dot(dir, normal);
  vec3 hit = eye + dir * t;
  vec2 q = (transpose(rot) * hit).xy;

  float a = uPlate.w;
  float px = 1.5 / uPlate.z;
  float outer = frameAt(q);

  vec2 s = (frag - vec2(uPlate.x, uRes.y)) / uRes.y;
  float width = 0.1 + 0.24 * clamp(-s.y, 0.0, 1.4);
  float shaft = exp(-pow(s.x / width, 2.0)) * smoothstep(-1.5, -0.05, s.y) * uLamp;
  vec3 room = vec3(1.0, 0.82, 0.62) * shaft * 0.01;
  vec2 cell = floor(frag / 46.0);
  vec2 mote = cell + vec2(hash(cell), hash(cell + 7.0));
  vec2 drift = vec2(sin(uTime * 0.13 + hash(cell) * 6.28), uTime * 0.09) * 9.0;
  float speck = smoothstep(2.2, 0.0, length(frag - (mote * 46.0 + drift)));
  room += vec3(1.0, 0.85, 0.6) * speck * shaft * step(0.9, hash(cell + 3.1)) * 0.22;
  float near = exp(-max(outer, 0.0) * 2.4);
  float molten = uMelt * smoothstep(0.0, 0.25, uFill);
  room += vec3(2.0, 0.55, 0.08) * near * near * molten * 0.06;

  float inner = box(q, vec2(a, 1.0));
  float field = 1.0 - smoothstep(-px, px, inner);
  float around = abs(atan(q.x, q.y)) / 3.14159;
  float front = uReveal * 1.1;
  float standing = mix(smoothstep(front, front - 0.05, around), smoothstep(0.75, 1.0, uReveal), field);

  if (outer > px || standing <= 0.0) {
    outColor = vec4(room, 1.0);
    return;
  }

  float melt = meltAt(q) * smoothstep(0.0, -0.02, inner);
  float e = 0.0016;
  float h = heightAt(q, melt);
  float hx = heightAt(q + vec2(e, 0.0), melt) - heightAt(q - vec2(e, 0.0), melt);
  float hy = heightAt(q + vec2(0.0, e), melt) - heightAt(q - vec2(0.0, e), melt);
  vec3 n = normalize(vec3(-hx / (2.0 * e), -hy / (2.0 * e), 1.0));
  vec3 point = vec3(q, h);
  vec3 view = normalize(transpose(rot) * (eye - hit));
  vec3 toLight = uLight - point;
  float falloff = 1.0 / (1.0 + dot(toLight, toLight) * 0.05);
  vec3 l = normalize(toLight);
  vec3 hv = normalize(l + view);
  float nl = max(dot(n, l), 0.0);
  float nv = max(dot(n, view), 1e-3);
  float nh = max(dot(n, hv), 0.0);

  vec2 uv = posterUv(q);
  vec3 print = textureLod(uPoster, uv, 0.0).rgb;
  float lit = dot(print, LUMA);

  float brushed = noise(vec2(q.x * 900.0, q.y * 6.0)) * 0.08;
  float rough = mix(0.5, 0.26, lit * field) + brushed;
  rough = mix(rough, 0.07, melt);
  vec3 albedo = GOLD * mix(1.0, mix(0.3, 1.08, smoothstep(0.02, 0.85, lit)), field);
  albedo = mix(albedo, GOLD * 0.9, melt);
  vec3 f0 = albedo;
  vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(hv, view), 0.0), 5.0);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float geometry = nl / (nl * (1.0 - k) + k) * nv / (nv * (1.0 - k) + k);
  vec3 spec = ggx(nh, rough) * fresnel * geometry / (4.0 * nl * nv + 1e-4);
  vec3 key = min(spec * nl, vec3(2.5)) * vec3(1.0, 0.95, 0.88) * 0.9 * falloff;

  vec3 r = rot * reflect(-view, n);
  vec3 envF = f0 + (max(vec3(1.0 - rough), f0) - f0) * pow(1.0 - nv, 5.0);
  float cut = engraveAt(q) * (1.0 - field) * (1.0 - uMelt);
  float cavity = mix(0.45, 1.0, smoothstep(0.0, 0.8, lit)) * field + (1.0 - field) * (1.0 - cut * 0.6);
  vec3 gold = (studio(r, rough) * envF * cavity + key) * 0.8;

  float glow = max(melt, uHeat * (1.0 - smoothstep(0.0, 0.9, lit + 0.25 * fbm(q * 3.0)))
    * smoothstep(-0.25, 0.2, q.y - mix(1.2, -1.3, uHeat)));
  vec2 flow = vec2(uTime * 0.05, -uTime * 0.11);
  float current = fbm(q * 2.6 + flow + fbm(q * 1.3 - flow) * 1.4);
  vec3 hot = mix(vec3(0.85, 0.32, 0.06), vec3(1.25, 0.8, 0.32), smoothstep(0.3, 0.75, current));
  hot *= 0.3 + 0.22 * current;
  vec3 color = mix(gold, hot + gold * 0.55, glow * field);
  float sweep = uCool * 2.5 - (1.0 - q.y) - q.x * 0.12 - (fbm(q * 3.0) - 0.5) * 0.08;
  float cool = smoothstep(0.0, 0.35, sweep) * field * (1.0 - melt);
  vec3 paint = pow(print, vec3(2.2));
  float soft = max(dot(n, normalize(vec3(-0.25, 0.35, 1.0))), 0.0);
  vec3 varnish = ggx(nh, 0.3) * nl * 0.05 * vec3(1.0, 0.97, 0.92) * falloff;
  vec3 shown = paint * (0.62 + 0.3 * soft) + min(varnish, vec3(0.25));
  float rim = exp(-pow((sweep - 0.04) / 0.035, 2.0)) * (1.0 - uCool) * (1.0 - melt);
  color = mix(color, shown, cool) + GOLD * rim * 0.18 * field;

  float level = surfaceAt(q);
  float pouring = step(0.0001, uFill) * (1.0 - step(1.0, uFill));
  float filled = max(smoothstep(level + px * 2.0, level - px * 2.0, q.y), step(1.0, uFill));
  vec3 empty = studio(r, 0.55) * GOLD * 0.035 * uLamp * smoothstep(0.75, 1.0, uReveal);
  color = mix(mix(empty, color, filled), color, 1.0 - field);
  color += blackbody(0.9) * exp(-pow((q.y - level) / 0.01, 2.0)) * field * pouring * 0.35;
  float wobble = sin(q.y * 7.0 + uTime * 3.0) * 0.006 * (1.0 - q.y);
  float stream = smoothstep(0.018, 0.006, abs(q.x - wobble)) * step(level, q.y) * field;
  stream *= pouring * smoothstep(1.0, 0.9, uFill);
  color = mix(color, blackbody(0.82) * 0.7 + GOLD * 0.2, stream);

  float glint = exp(-pow((around - front) / 0.02, 2.0)) * (1.0 - field) * (1.0 - smoothstep(0.85, 1.0, uReveal));
  color += vec3(1.0, 0.88, 0.66) * glint * 1.6;
  vec2 rail = railAt(q);
  float spark = exp(-pow((rail.x - burin()) / 0.004, 2.0)) * exp(-pow((rail.y - 0.5) / 0.35, 2.0));
  color += vec3(1.0, 0.86, 0.6) * spark * step(0.0001, uCut) * (1.0 - step(1.0, uCut)) * (1.0 - field) * 1.4;

  float cover = smoothstep(px, -px, outer) * standing;
  color *= mix(1.0, standing, field);
  float edge = smoothstep(-0.03, 0.0, outer);
  color += GOLD * edge * 0.03 * uLamp;
  outColor = vec4(mix(room, color, cover), 1.0);
}`;

export class Foundry {
  private readonly loop: Loop;
  private readonly bloom: Bloom;
  private readonly texture: WebGLTexture;
  private readonly engraving: WebGLTexture;
  private readonly u;
  private readonly bitmaps = new Map<string, Promise<ImageBitmap | null>>();
  private plate: FoundryPlate | null = null;
  private shown: string | null = null;
  private wanted: string | null = null;
  private ready: ImageBitmap | null = null;
  private label = "";
  private engraved: string | null = null;
  private melt = 1;
  private heat = 1;
  private cool = 0;
  private lamp = 0;
  private reveal = 0;
  private fill = 0;
  private cut = 0;
  private opened = false;
  private tilt: [number, number] = [0, 0];
  private tiltTo: [number, number] = [0, 0];
  private light: [number, number, number] = [...FOUNDRY_REST_LIGHT];
  private lightTo: [number, number, number] = [...FOUNDRY_REST_LIGHT];
  private reduced = false;
  private started = performance.now() / 1000;

  static create(
    canvas: HTMLCanvasElement,
    font: string,
    events: FoundryEvents,
    loop: LoopFactory = createLoop,
  ): Foundry | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    const program = createProgram(gl, FOUNDRY_FRAGMENT);
    const bloom = Bloom.create(gl);
    if (!program || !bloom) return null;
    return new Foundry(canvas, gl, program, bloom, font, events, loop);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    private readonly program: WebGLProgram,
    bloom: Bloom,
    private readonly font: string,
    private readonly events: FoundryEvents,
    loop: LoopFactory,
  ) {
    this.bloom = bloom;
    bindFullscreen(gl, program, ...bloom.programs);
    this.u = uniforms(gl, program, FOUNDRY_UNIFORMS);
    this.texture = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([40, 30, 20, 255]),
    );
    this.engraving = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    this.loop = loop((now, dt) => this.frame(now, dt));
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.loop.wake();
  }

  setPlate(x: number, y: number, width: number, height: number): void {
    const ratio = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    this.plate = {
      aspect: width / height,
      centerX: (x + width / 2) * ratio,
      centerY: this.canvas.height - (y + height / 2) * ratio,
      half: (height / 2) * ratio,
    };
    this.loop.wake();
  }

  resize(): void {
    fitCanvas(this.canvas, 1.5);
    this.loop.wake();
  }

  point(x: number | null, y: number | null): void {
    const plate = this.plate;
    if (!plate || x === null || y === null) {
      this.tiltTo = [0, 0];
      this.lightTo = [...FOUNDRY_REST_LIGHT];
    } else {
      const ratio = this.canvas.width / Math.max(1, this.canvas.clientWidth);
      const px = (x * ratio - plate.centerX) / plate.half;
      const py = (this.canvas.height - y * ratio - plate.centerY) / plate.half;
      const angle = Math.atan2(py, px);
      this.lightTo = [
        Math.cos(angle) * FOUNDRY_REACH,
        Math.sin(angle) * FOUNDRY_REACH,
        FOUNDRY_REST_LIGHT[2],
      ];
      if (!this.reduced) {
        this.tiltTo = [
          clamp(px / 3, -1, 1) * FOUNDRY_TILT,
          clamp(-py / 3, -1, 1) * FOUNDRY_TILT,
        ];
      }
    }
    this.loop.wake();
  }

  show(src: string, label: string, neighbours: readonly string[] = []): void {
    this.wanted = src;
    this.label = label;
    this.fetch(src).then((bitmap) => {
      if (this.wanted === src) {
        this.ready = bitmap;
        this.loop.wake();
      }
    });
    for (const next of neighbours) void this.fetch(next);
    this.loop.wake();
  }

  dispose(): void {
    this.loop.dispose();
    this.bloom.dispose();
    this.gl.deleteTexture(this.texture);
    this.gl.deleteTexture(this.engraving);
    this.gl.deleteProgram(this.program);
    this.bitmaps.clear();
  }

  private fetch(src: string): Promise<ImageBitmap | null> {
    let bitmap = this.bitmaps.get(src);
    if (!bitmap) {
      bitmap = loadBitmap(src, FOUNDRY_POSTER);
      this.bitmaps.set(src, bitmap);
    }
    return bitmap;
  }

  private upload(bitmap: ImageBitmap): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    void this.engrave(this.label);
  }

  private async engrave(label: string): Promise<void> {
    const plate = this.plate;
    if (!plate || this.engraved === label) return;
    const height = Math.round(
      (FOUNDRY_ENGRAVE_WIDTH * FOUNDRY_RAIL) / (2 * plate.aspect),
    );
    const size = Math.round(height * 0.8);
    const face = `700 ${size}px ${this.font}`;
    await document.fonts.load(face, label).catch(() => undefined);
    if (this.label !== label) return;
    const canvas = new OffscreenCanvas(FOUNDRY_ENGRAVE_WIDTH, height);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#000";
    context.fillRect(0, 0, FOUNDRY_ENGRAVE_WIDTH, height);
    context.filter = `blur(${(height * 0.018).toFixed(2)}px)`;
    context.font = face;
    context.letterSpacing = `${Math.round(size * 0.1)}px`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.fillText(label, FOUNDRY_ENGRAVE_WIDTH / 2, height * 0.53);
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.engraving);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.engraved = label;
    this.loop.wake();
  }

  private frame(now: number, dt: number): boolean {
    const gl = this.gl;
    const plate = this.plate;
    if (!plate) return false;
    fitCanvas(this.canvas, 1.5);

    const changing = this.wanted !== null && this.wanted !== this.shown;
    const swap = () => {
      this.upload(this.ready!);
      this.shown = this.wanted;
      this.cut = 0;
    };
    if (this.reduced) {
      if (changing && this.ready) swap();
      const on = this.shown ? 1 : 0;
      this.lamp = this.reveal = this.fill = this.cut = on;
      this.melt = 1 - on;
      this.heat = 0;
      this.cool = 1;
    } else if (this.fill < 1) {
      if (changing && this.ready) swap();
      if (this.shown) this.lamp = Math.min(1, this.lamp + dt / FOUNDRY_LAMP_S);
      if (this.lamp >= FOUNDRY_LAMP_AT) {
        this.reveal = Math.min(1, this.reveal + dt / FOUNDRY_REVEAL_S);
      }
      if (this.reveal >= 1)
        this.fill = Math.min(1, this.fill + dt / FOUNDRY_FILL_S);
    } else if (changing) {
      this.melt = Math.min(1, this.melt + dt / FOUNDRY_MELT_S);
      if (this.melt >= 1 && this.ready) {
        swap();
        this.heat = 1;
        this.cool = 0;
      }
    } else {
      this.melt = Math.max(0, this.melt - dt / FOUNDRY_CAST_S);
      if (this.melt < 0.5)
        this.heat = Math.max(0, this.heat - dt / FOUNDRY_HEAT_S);
      if (this.heat < 0.6)
        this.cool = Math.min(1, this.cool + dt / FOUNDRY_SET_S);
    }
    if (this.melt === 0 && this.cool >= 1 && !changing) {
      this.cut = Math.min(1, this.cut + dt / FOUNDRY_CUT_S);
    }
    if (!this.opened && this.cut >= 1) {
      this.opened = true;
      this.events.opened();
    }
    this.tilt = [
      approach(this.tilt[0], this.tiltTo[0], 1.2, dt),
      approach(this.tilt[1], this.tiltTo[1], 1.2, dt),
    ];
    this.light = [
      approach(this.light[0], this.lightTo[0], 0.5, dt),
      approach(this.light[1], this.lightTo[1], 0.5, dt),
      approach(this.light[2], this.lightTo[2], 0.5, dt),
    ];

    const time = now - this.started;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.bloom.begin(width, height);
    gl.useProgram(this.program);
    const u = this.u;
    gl.uniform2f(u.uRes, width, height);
    gl.uniform4f(
      u.uPlate,
      plate.centerX,
      plate.centerY,
      plate.half,
      plate.aspect,
    );
    gl.uniform2f(u.uTilt, this.tilt[0], this.tilt[1]);
    gl.uniform3f(u.uLight, ...this.light);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uMelt, smooth(this.melt));
    gl.uniform1f(u.uCool, smooth(this.cool));
    gl.uniform1f(u.uHeat, this.heat);
    gl.uniform1f(u.uLamp, smooth(this.lamp));
    gl.uniform1f(u.uReveal, smooth(this.reveal));
    gl.uniform1f(u.uFill, this.fill < 1 ? smooth(this.fill) : 1);
    gl.uniform1f(u.uCut, this.cut < 1 ? smooth(this.cut) : 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u.uPoster, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.engraving);
    gl.uniform1i(u.uEngrave, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.bloom.present(FOUNDRY_LOOK, time);

    const settled =
      !changing &&
      this.fill === 1 &&
      this.cut === 1 &&
      this.melt === 0 &&
      this.heat === 0 &&
      this.cool === 1 &&
      Math.abs(this.tilt[0] - this.tiltTo[0]) < 1e-4 &&
      Math.abs(this.tilt[1] - this.tiltTo[1]) < 1e-4 &&
      Math.abs(this.light[0] - this.lightTo[0]) < 1e-3 &&
      Math.abs(this.light[1] - this.lightTo[1]) < 1e-3;
    return !settled || (changing && !this.reduced);
  }
}
