import {
  createProgram,
  createTexture,
  readable,
  uniforms,
} from "@/motion/render";
import {
  BLOOM_COMPOSITE_UNIFORMS,
  BLOOM_DOWN_UNIFORMS,
  BLOOM_LEVELS,
  BLOOM_UP_UNIFORMS,
} from "./constants";
import type { BloomLook, LoopFactory, RenderTarget } from "./types";

export function imagesReady(element: HTMLElement): Promise<void> {
  const view = { height: window.innerHeight, width: window.innerWidth };
  const pending = [...element.querySelectorAll("img")].filter((image) => {
    if (image.complete) return false;
    const box = image.getBoundingClientRect();
    return (
      box.width > 0 &&
      box.top < view.height * 1.2 &&
      box.bottom > 0 &&
      box.left < view.width &&
      box.right > 0
    );
  });
  return Promise.all(
    pending.map(
      (image) =>
        new Promise<void>((resolve) => {
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }),
    ),
  ).then(() => undefined);
}

export async function loadBitmap(
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

export const createLoop: LoopFactory = (step) => {
  let frame = 0;
  let last = 0;
  let disposed = false;

  const tick = (now: number) => {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    if (step(now / 1000, dt)) frame = requestAnimationFrame(tick);
    else last = 0;
  };

  const wake = () => {
    if (disposed || frame || document.hidden) return;
    frame = requestAnimationFrame(tick);
  };

  document.addEventListener("visibilitychange", wake);
  wake();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", wake);
    },
    wake,
  };
};

const POST_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const DOWN_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;

vec3 tap(float x, float y) {
  return texture(uSource, vUv + vec2(x, y) * uTexel).rgb;
}

void main() {
  vec3 color =
    (tap(-1.0, -1.0) + tap(1.0, -1.0) + tap(-1.0, 1.0) + tap(1.0, 1.0)) * 0.125 +
    (tap(-2.0, -2.0) + tap(2.0, -2.0) + tap(-2.0, 2.0) + tap(2.0, 2.0)) * 0.03125 +
    (tap(0.0, -2.0) + tap(-2.0, 0.0) + tap(2.0, 0.0) + tap(0.0, 2.0)) * 0.0625 +
    tap(0.0, 0.0) * 0.125;
  if (uThreshold > 0.0) {
    float bright = max(max(color.r, color.g), color.b);
    float knee = uThreshold * 0.5;
    float soft = clamp(bright - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    color *= max(soft, bright - uThreshold) / max(bright, 1e-4);
  }
  outColor = vec4(color, 1.0);
}`;

const UP_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uSource;
uniform vec2 uTexel;

vec3 tap(float x, float y) {
  return texture(uSource, vUv + vec2(x, y) * uTexel).rgb;
}

void main() {
  vec3 color =
    tap(0.0, 0.0) * 4.0 +
    (tap(-1.0, 0.0) + tap(1.0, 0.0) + tap(0.0, -1.0) + tap(0.0, 1.0)) * 2.0 +
    tap(-1.0, -1.0) + tap(1.0, -1.0) + tap(-1.0, 1.0) + tap(1.0, 1.0);
  outColor = vec4(color / 16.0, 1.0);
}`;

const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform float uTime;
uniform float uGrain;
uniform float uExposure;
uniform float uBloomAmount;
uniform float uVignette;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 shoulder(vec3 c) {
  float peak = max(max(c.r, c.g), c.b);
  const float K = 0.72;
  if (peak <= K) return c;
  float m = K + (1.0 - K) * (1.0 - exp(-(peak - K) / (1.0 - K)));
  return c * (m / peak);
}

void main() {
  vec2 c = vUv - 0.5;
  vec2 a = c * vec2(uRes.x / uRes.y, 1.0);
  vec2 fringe = c * dot(a, a) * 0.004;
  vec4 scene = texture(uScene, vUv);
  vec3 color = vec3(
    texture(uScene, vUv - fringe).r,
    scene.g,
    texture(uScene, vUv + fringe).b
  );
  color += texture(uBloom, vUv).rgb * uBloomAmount;
  color = shoulder(color * uExposure);
  color *= mix(1.0 - uVignette, 1.0, smoothstep(1.2, 0.3, length(a)));
  color = pow(max(color, 0.0), vec3(1.0 / 2.2));
  float grain = hash(floor(vUv * uRes / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * uGrain * dot(color, vec3(0.3333));
  outColor = vec4(max(color, 0.0), 1.0);
}`;

export class Bloom {
  readonly hdr: boolean;
  private readonly ud;
  private readonly uu;
  private readonly uc;
  private scene: RenderTarget | null = null;
  private levels: RenderTarget[] = [];

  static create(gl: WebGL2RenderingContext, depth = false): Bloom | null {
    const down = createProgram(gl, DOWN_FRAGMENT, POST_VERTEX);
    const up = createProgram(gl, UP_FRAGMENT, POST_VERTEX);
    const composite = createProgram(gl, COMPOSITE_FRAGMENT, POST_VERTEX);
    if (!down || !up || !composite) return null;
    return new Bloom(gl, [down, up, composite], depth);
  }

  private constructor(
    private readonly gl: WebGL2RenderingContext,
    readonly programs: readonly [WebGLProgram, WebGLProgram, WebGLProgram],
    private readonly depth: boolean,
  ) {
    const [down, up, composite] = programs;
    this.ud = uniforms(gl, down, BLOOM_DOWN_UNIFORMS);
    this.uu = uniforms(gl, up, BLOOM_UP_UNIFORMS);
    this.uc = uniforms(gl, composite, BLOOM_COMPOSITE_UNIFORMS);
    this.hdr = Boolean(gl.getExtension("EXT_color_buffer_float"));
  }

  begin(width: number, height: number): void {
    if (this.scene?.width !== width || this.scene.height !== height) {
      this.release();
      this.scene = this.target(width, height, this.depth);
      let w = width;
      let h = height;
      for (let i = 0; i < BLOOM_LEVELS; i += 1) {
        w = Math.max(1, w >> 1);
        h = Math.max(1, h >> 1);
        this.levels.push(this.target(w, h));
        if (w < 8 || h < 8) break;
      }
    }
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene!.fbo);
    gl.viewport(0, 0, width, height);
  }

  present(look: BloomLook, time: number): void {
    const { gl, levels } = this;
    const scene = this.scene!;
    const [down, up, composite] = this.programs;
    const threshold = this.hdr ? look.threshold : look.threshold * 0.7;

    gl.disable(gl.BLEND);
    gl.useProgram(down);
    gl.uniform1i(this.ud.uSource, 0);
    gl.activeTexture(gl.TEXTURE0);
    let source = scene;
    levels.forEach((level, i) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, level.fbo);
      gl.viewport(0, 0, level.width, level.height);
      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.uniform2f(this.ud.uTexel, 1 / source.width, 1 / source.height);
      gl.uniform1f(this.ud.uThreshold, i === 0 ? threshold : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      source = level;
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(up);
    gl.uniform1i(this.uu.uSource, 0);
    for (let i = levels.length - 1; i > 0; i -= 1) {
      const from = levels[i]!;
      const to = levels[i - 1]!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, to.fbo);
      gl.viewport(0, 0, to.width, to.height);
      gl.bindTexture(gl.TEXTURE_2D, from.texture);
      gl.uniform2f(this.uu.uTexel, 1 / from.width, 1 / from.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, scene.width, scene.height);
    gl.useProgram(composite);
    const c = this.uc;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, levels[0]?.texture ?? scene.texture);
    gl.uniform1i(c.uScene, 0);
    gl.uniform1i(c.uBloom, 1);
    gl.uniform2f(c.uRes, scene.width, scene.height);
    gl.uniform1f(c.uTime, time);
    gl.uniform1f(c.uGrain, look.grain);
    gl.uniform1f(c.uExposure, 1);
    gl.uniform1f(c.uBloomAmount, this.hdr ? look.amount : look.amount * 0.6);
    gl.uniform1f(c.uVignette, look.vignette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }

  dispose(): void {
    this.release();
    for (const program of this.programs) this.gl.deleteProgram(program);
  }

  private target(width: number, height: number, depth = false): RenderTarget {
    const gl = this.gl;
    const texture = createTexture(gl);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.hdr ? gl.RGBA16F : gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      this.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      null,
    );
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    let buffer: WebGLRenderbuffer | null = null;
    if (depth) {
      buffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, buffer);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT24,
        width,
        height,
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        buffer,
      );
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { depth: buffer, fbo, height, texture, width };
  }

  private release(): void {
    for (const target of [this.scene, ...this.levels]) {
      if (!target) continue;
      this.gl.deleteFramebuffer(target.fbo);
      this.gl.deleteTexture(target.texture);
      if (target.depth) this.gl.deleteRenderbuffer(target.depth);
    }
    this.scene = null;
    this.levels = [];
  }
}
