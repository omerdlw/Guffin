"use client";

import { useEffect, useRef, useState, type JSX } from "react";

// A WebGL liquid-glass prototype, beside the SVG lens, for comparing them.
//
// The browser will not hand a shader the pixels behind a DOM element, so
// this draws the wallpaper itself: the picture is laid into a framebuffer
// (cover-fitted, once per resize) and blurred into a second one. Each frame
// is then a single pass: every glass shape is a rounded box in a signed
// distance field, merged with a smooth minimum (two shapes melt into one
// when they meet). Inside the field, the rim's surface normal comes from
// the field's gradient; a ray meets a convex squircle profile and refracts
// by Snell's law (n 1.5), the same profile the SVG lens uses, so the scene
// is read a little inward at the rim. Each colour channel bends a little
// differently, then the frost, the edge light and the glint go on top.

type Shape = { x: number; y: number; w: number; h: number; r: number };
type Mode = 0 | 1 | 2;

type Knobs = {
  bend: number;
  frost: number;
  dispersion: number;
  merge: number;
  bezel: number;
  mode: Mode;
};

const MAX_SHAPES = 4;
const MAX_DPR = 2;

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// The picture, cover-fitted to the target (bottom-origin rows, like GL).
const SCENE = `#version 300 es
precision highp float;
uniform sampler2D uImg;
uniform vec2 uRes;
uniform vec2 uImgSize;
out vec4 o;
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float s = max(uRes.x / uImgSize.x, uRes.y / uImgSize.y);
  vec2 uv = (px - (uRes - uImgSize * s) * 0.5) / (uImgSize * s);
  o = texture(uImg, uv);
}`;

// One axis of a 9-tap gaussian.
const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 o;
void main() {
  vec2 size = vec2(textureSize(uTex, 0));
  vec2 uv = gl_FragCoord.xy / size;
  vec2 stride = uDir / size * 1.5;
  float w[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 c = texture(uTex, uv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 d = stride * float(i);
    c += (texture(uTex, uv + d).rgb + texture(uTex, uv - d).rgb) * w[i];
  }
  o = vec4(c, 1.0);
}`;

const GLASS = `#version 300 es
precision highp float;
uniform sampler2D uSharp;
uniform sampler2D uBlur;
uniform vec2 uRes;
uniform float uDpr;
uniform vec4 uShape[${MAX_SHAPES}];
uniform float uRadius[${MAX_SHAPES}];
uniform int uCount;
uniform float uBend;
uniform float uFrost;
uniform float uDisp;
uniform float uMerge;
uniform float uBezel;
uniform int uMode;
out vec4 o;

float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float field(vec2 p) {
  float d = 1e5;
  for (int i = 0; i < ${MAX_SHAPES}; i++) {
    if (i >= uCount) break;
    d = smin(d, box(p - uShape[i].xy, uShape[i].zw, uRadius[i]), uMerge);
  }
  return d;
}

float squircle(float t) { return pow(1.0 - pow(1.0 - t, 4.0), 0.25); }

// Displacement (device px) at depth t across the bezel: 0 edge, 1 inside.
float bendAt(float t) {
  float th = 1.9 * uBezel;
  float e = 0.001;
  t = clamp(t, e, 1.0 - e);
  float slope = (squircle(t + e) - squircle(t - e)) / (2.0 * e) * (th / uBezel);
  float inc = atan(slope);
  float ref = asin(sin(inc) / 1.5);
  return th * squircle(t) * tan(inc - ref);
}

// The refraction grid: lines every 24 css px instead of the picture.
vec3 grid(vec2 p) {
  vec2 g = abs(fract(p / (24.0 * uDpr) - 0.5) - 0.5) * 24.0 * uDpr;
  float line = 1.0 - smoothstep(0.0, 1.2 * uDpr, min(g.x, g.y));
  return mix(vec3(0.94), vec3(0.15, 0.2, 0.35), line);
}

vec3 sharpAt(vec2 p) { return uMode == 2 ? grid(p) : texture(uSharp, p / uRes).rgb; }
vec3 blurAt(vec2 p) { return uMode == 2 ? grid(p) : texture(uBlur, p / uRes).rgb; }

void main() {
  vec2 p = gl_FragCoord.xy;
  float d = field(p);

  if (uMode == 1) {
    float css = d / uDpr;
    vec3 c = css < 0.0 ? vec3(0.25, 0.45, 0.95) : vec3(0.95, 0.6, 0.25);
    c *= 0.55 + 0.45 * exp(-abs(css) / 40.0);
    c *= 0.8 + 0.2 * cos(css * 0.7);
    c = mix(vec3(1.0), c, smoothstep(0.0, 1.5, abs(css)));
    o = vec4(c, 1.0);
    return;
  }

  vec3 bg = sharpAt(p);
  // The drop shadow: the field moved down, softened.
  float ds = field(p + vec2(0.0, 8.0 * uDpr));
  float shadow = (1.0 - smoothstep(-6.0 * uDpr, 30.0 * uDpr, ds)) * 0.2;
  vec3 outside = bg * (1.0 - shadow);
  if (d > 1.0) {
    o = vec4(outside, 1.0);
    return;
  }

  vec2 g = vec2(field(p + vec2(1.0, 0.0)) - field(p - vec2(1.0, 0.0)),
                field(p + vec2(0.0, 1.0)) - field(p - vec2(0.0, 1.0)));
  vec2 n = g / max(length(g), 1e-5);
  float t = clamp(-d / uBezel, 0.0, 1.0);
  vec2 off = -n * bendAt(t) * uBend;
  vec2 pr = p + off * (1.0 + uDisp);
  vec2 pg = p + off;
  vec2 pb = p + off * (1.0 - uDisp);

  vec3 sharp = vec3(sharpAt(pr).r, sharpAt(pg).g, sharpAt(pb).b);
  vec3 soft = vec3(blurAt(pr).r, blurAt(pg).g, blurAt(pb).b);
  vec3 c = mix(sharp, soft, uFrost);

  // Tone: a little richer, a touch of white.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, 1.2);
  c = mix(c, vec3(1.0), 0.06);

  // Edge light: the scene in the bezel, brightened.
  float rim = pow(1.0 - t, 3.0);
  c += c * rim * 0.35;

  // The glint: light from the top left, and its opposite corner.
  vec2 light = normalize(vec2(-1.0, 1.0));
  float facing = max(dot(n, light), 0.0) + 0.55 * max(dot(n, -light), 0.0);
  float hair = 1.0 - smoothstep(0.0, 1.5 * uDpr, -d);
  float bloom = 1.0 - smoothstep(0.0, 9.0 * uDpr, -d);
  c += hair * (0.3 + 0.7 * facing) * 0.85 + bloom * facing * 0.16;

  float a = clamp(0.5 - d, 0.0, 1.0);
  o = vec4(mix(outside, min(c, vec3(1.0)), a), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  }
  return shader;
}

function program(gl: WebGL2RenderingContext, fragment: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) ?? "program");
  }
  const cache = new Map<string, WebGLUniformLocation | null>();
  const at = (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
    return cache.get(name)!;
  };
  return { p, at };
}

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

function target(gl: WebGL2RenderingContext, w: number, h: number): Target {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  );
  return { fb, tex, w, h };
}

function free(gl: WebGL2RenderingContext, t: Target | null) {
  if (!t) return;
  gl.deleteFramebuffer(t.fb);
  gl.deleteTexture(t.tex);
}

function hit(shapes: Shape[], x: number, y: number): number {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i]!;
    const qx = Math.abs(x - s.x) - s.w / 2 + s.r;
    const qy = Math.abs(y - s.y) - s.h / 2 + s.r;
    const d =
      Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
      Math.min(Math.max(qx, qy), 0) -
      s.r;
    if (d < 0) return i;
  }
  return -1;
}

function initialShapes(width: number, height: number): Shape[] {
  const cx = width * 0.62;
  return [
    { x: cx, y: height * 0.78, w: 340, h: 68, r: 34 },
    { x: cx - 110, y: height * 0.42, w: 130, h: 130, r: 65 },
    { x: cx + 120, y: height * 0.42, w: 240, h: 150, r: 30 },
  ];
}

const MODES: { mode: Mode; label: string }[] = [
  { mode: 0, label: "Cam" },
  { mode: 1, label: "Mesafe alanı" },
  { mode: 2, label: "Kırılma ızgarası" },
];

const SLIDERS: {
  key: Exclude<keyof Knobs, "mode">;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "bend", label: "Kırılma", min: 0, max: 6, step: 0.05 },
  { key: "frost", label: "Buzlanma", min: 0, max: 1, step: 0.01 },
  { key: "dispersion", label: "Dispersiyon", min: 0, max: 1, step: 0.01 },
  { key: "bezel", label: "Bezel (px)", min: 6, max: 120, step: 1 },
  { key: "merge", label: "Erime (px)", min: 1, max: 90, step: 1 },
];

export function GlassLab({ src }: { src: string }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domLensRef = useRef<HTMLDivElement>(null);
  const [knobs, setKnobs] = useState<Knobs>({
    bend: 1,
    frost: 0.35,
    dispersion: 0.07,
    merge: 28,
    bezel: 22,
    mode: 0,
  });
  const knobsRef = useRef(knobs);
  const renderRef = useRef<() => void>(() => {});
  const [failed, setFailed] = useState<string | null>(null);
  const [frameMs, setFrameMs] = useState<number | null>(null);

  useEffect(() => {
    knobsRef.current = knobs;
    renderRef.current();
  }, [knobs]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) {
      setFailed("WebGL2 yok");
      return;
    }

    let scene: ReturnType<typeof program>;
    let blur: ReturnType<typeof program>;
    let glass: ReturnType<typeof program>;
    try {
      scene = program(gl, SCENE);
      blur = program(gl, BLUR);
      glass = program(gl, GLASS);
    } catch (error) {
      setFailed(String(error));
      return;
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    let image: WebGLTexture | null = null;
    let imageSize = [1, 1];
    let sharp: Target | null = null;
    let soft: Target | null = null;
    let spare: Target | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let shapes: Shape[] = [];
    let frame = 0;
    let disposed = false;

    const draw = (t: Target | null, w: number, h: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
      gl.viewport(0, 0, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // The picture and its frost: once per size.
    const prepare = () => {
      if (!image || !width) return;
      const w = Math.round(width * dpr);
      const h = Math.round(height * dpr);
      free(gl, sharp);
      free(gl, soft);
      free(gl, spare);
      sharp = target(gl, w, h);
      const qw = Math.max(1, Math.round(w / 4));
      const qh = Math.max(1, Math.round(h / 4));
      soft = target(gl, qw, qh);
      spare = target(gl, qw, qh);

      gl.useProgram(scene.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, image);
      gl.uniform1i(scene.at("uImg"), 0);
      gl.uniform2f(scene.at("uImgSize"), imageSize[0]!, imageSize[1]!);
      gl.uniform2f(scene.at("uRes"), w, h);
      draw(sharp, w, h);
      gl.uniform2f(scene.at("uRes"), qw, qh);
      draw(soft, qw, qh);

      gl.useProgram(blur.p);
      gl.uniform1i(blur.at("uTex"), 0);
      for (let i = 0; i < 3; i++) {
        gl.bindTexture(gl.TEXTURE_2D, soft.tex);
        gl.uniform2f(blur.at("uDir"), 1, 0);
        draw(spare, qw, qh);
        gl.bindTexture(gl.TEXTURE_2D, spare.tex);
        gl.uniform2f(blur.at("uDir"), 0, 1);
        draw(soft, qw, qh);
      }
    };

    const paint = () => {
      frame = 0;
      if (!sharp || !soft || disposed) return;
      const k = knobsRef.current;
      const started = performance.now();
      const w = canvas.width;
      const h = canvas.height;
      gl.useProgram(glass.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sharp.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, soft.tex);
      gl.uniform1i(glass.at("uSharp"), 0);
      gl.uniform1i(glass.at("uBlur"), 1);
      gl.uniform2f(glass.at("uRes"), w, h);
      gl.uniform1f(glass.at("uDpr"), dpr);
      const boxes = new Float32Array(MAX_SHAPES * 4);
      const radii = new Float32Array(MAX_SHAPES);
      shapes.forEach((s, i) => {
        boxes.set(
          [s.x * dpr, h - s.y * dpr, (s.w / 2) * dpr, (s.h / 2) * dpr],
          i * 4,
        );
        radii[i] = s.r * dpr;
      });
      gl.uniform4fv(glass.at("uShape"), boxes);
      gl.uniform1fv(glass.at("uRadius"), radii);
      gl.uniform1i(glass.at("uCount"), shapes.length);
      gl.uniform1f(glass.at("uBend"), k.bend);
      gl.uniform1f(glass.at("uFrost"), k.frost);
      gl.uniform1f(glass.at("uDisp"), k.dispersion);
      gl.uniform1f(glass.at("uMerge"), Math.max(1, k.merge * dpr));
      gl.uniform1f(glass.at("uBezel"), k.bezel * dpr);
      gl.uniform1i(glass.at("uMode"), k.mode);
      draw(null, w, h);
      setFrameMs(performance.now() - started);
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    renderRef.current = request;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (!shapes.length) shapes = initialShapes(width, height);
      prepare();
      request();
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      image = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, image);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      imageSize = [img.naturalWidth, img.naturalHeight];
      prepare();
      request();
    };
    img.onerror = () => setFailed("Duvar kağıdı yüklenemedi");
    img.src = src;

    // Dragging: the shape under the pointer follows it.
    let dragging = -1;
    let grab = [0, 0];
    const down = (e: PointerEvent) => {
      dragging = hit(shapes, e.clientX, e.clientY);
      if (dragging < 0) return;
      const s = shapes[dragging]!;
      grab = [e.clientX - s.x, e.clientY - s.y];
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      canvas.style.cursor =
        hit(shapes, e.clientX, e.clientY) >= 0 ? "grab" : "";
      if (dragging < 0) return;
      const s = shapes[dragging]!;
      s.x = e.clientX - grab[0]!;
      s.y = e.clientY - grab[1]!;
      request();
    };
    const up = () => {
      dragging = -1;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    window.addEventListener("resize", resize);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderRef.current = () => {};
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      window.removeEventListener("resize", resize);
      free(gl, sharp);
      free(gl, soft);
      free(gl, spare);
      gl.deleteTexture(image);
    };
  }, [src]);

  // The SVG lens, for comparison: dragged by hand.
  useEffect(() => {
    const el = domLensRef.current!;
    let grab: [number, number] | null = null;
    const down = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      grab = [e.clientX - r.left, e.clientY - r.top];
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!grab) return;
      el.style.left = `${e.clientX - grab[0]}px`;
      el.style.top = `${e.clientY - grab[1]}px`;
    };
    const up = () => {
      grab = null;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <>
      <canvas className="fixed inset-0 size-full touch-none" ref={canvasRef} />

      <div
        className="liquid liquid-flat liquid-lens fixed grid h-[68px] w-[340px] cursor-grab touch-none place-items-center rounded-full type-body text-ink select-none"
        ref={domLensRef}
        style={{ left: "34%", top: "62%" }}
      >
        SVG lens (mevcut)
      </div>

      <div className="liquid liquid-lens fixed top-fib-4 right-fib-4 z-10 flex w-64 flex-col gap-fib-3 rounded-shell p-fib-4 type-body text-ink">
        <div className="flex flex-col gap-fib-1">
          <strong>WebGL cam</strong>
          <span className="text-ink-lead">
            {failed ??
              (frameMs === null
                ? "Yükleniyor…"
                : `Kare: ${frameMs.toFixed(2)} ms (CPU) · şekilleri sürükle`)}
          </span>
        </div>
        <div className="flex flex-wrap gap-fib-1">
          {MODES.map(({ mode, label }) => (
            <button
              className={`rounded-full px-fib-3 py-fib-1 ${knobs.mode === mode ? "bg-(--liquid-well-hover)" : "bg-(--liquid-well)"}`}
              key={mode}
              onClick={() => setKnobs((k) => ({ ...k, mode }))}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {SLIDERS.map(({ key, label, min, max, step }) => (
          <label className="flex flex-col gap-fib-1" key={key}>
            <span className="flex justify-between">
              <span>{label}</span>
              <span className="text-ink-lead tabular-nums">{knobs[key]}</span>
            </span>
            <input
              max={max}
              min={min}
              onChange={(e) =>
                setKnobs((k) => ({ ...k, [key]: Number(e.target.value) }))
              }
              step={step}
              type="range"
              value={knobs[key]}
            />
          </label>
        ))}
      </div>
    </>
  );
}
