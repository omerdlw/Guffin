import { tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  createProgram,
  createTexture,
  fitCanvas,
  uniforms,
} from "@/motion/render";
import {
  MAX_FILMS,
  PORTRAIT_CONDENSE_S,
  PORTRAIT_CRUMBLE_S,
  PORTRAIT_DEVELOP_S,
  PORTRAIT_FORMED,
  PORTRAIT_GATHER_S,
  PORTRAIT_LOOK,
  PORTRAIT_PHOTO,
  PORTRAIT_PHOTO_UNIFORMS,
  PORTRAIT_SCATTER_S,
  PORTRAIT_UNDEVELOP_S,
  PORTRAIT_UNIFORMS,
} from "./constants";
import { Bloom, createLoop, loadBitmap } from "./gl";
import { gatherSwarm } from "./swarm";
import type {
  Director,
  GatherJob,
  Loop,
  LoopFactory,
  PortraitBox,
  PortraitEvents,
  Swarm,
  SwarmReply,
  SwarmRequest,
} from "./types";
import { subjectOf } from "./utils";

const SWARM_VERTEX = `#version 300 es
layout(location = 0) in vec2 aHome;
layout(location = 1) in vec2 aFace;
layout(location = 2) in vec3 aColor;
layout(location = 3) in vec3 aMeta;
layout(location = 4) in vec3 aSource;
uniform vec2 uRes;
uniform vec4 uFace;
uniform vec4 uPosters[${MAX_FILMS}];
uniform float uPhase;
uniform float uTime;
uniform vec2 uFaceGrid;
uniform vec2 uPosterGrid;
uniform float uScale;
uniform float uDust;
uniform float uFade;
out vec3 vColor;
out float vAlpha;
out float vFlight;
out float vSize;

float ease(float x) { return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); }

void main() {
  int film = int(aMeta.x + 0.5);
  float seed = aMeta.y;
  vec4 poster = uPosters[film];
  vec2 face = uFace.xy + aFace * uFace.zw;
  float turn = fract(seed * 7.13) * 6.28318;
  float spread = (0.1 + fract(seed * 3.71) * 0.32) * uFace.z;
  vec2 dust = face + vec2(cos(turn), sin(turn)) * spread - vec2(0.0, 0.08 * uFace.w);
  vec2 home = mix(poster.xy + aHome * poster.zw, dust, uDust);

  float delay = mix((1.0 - aMeta.z) * 0.3, aFace.y * 0.3, uDust) + seed * 0.14;
  float t = clamp((uPhase - delay) / 0.56, 0.0, 1.0);
  float e = ease(t);

  vec2 d = face - home;
  vec2 side = normalize(vec2(-d.y, d.x) + 1e-5);
  vec2 bow = side * (seed - 0.5) * length(d) * 0.7;
  vec2 mid = (home + face) * 0.5 + bow;
  vec2 p = mix(mix(home, mid, e), mix(mid, face, e), e);
  float flight = sin(e * 3.14159);
  p += vec2(sin(uTime * 1.3 + seed * 40.0), cos(uTime * 1.1 + seed * 31.0)) * flight * 14.0 * uScale;

  vec2 clip = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  float faceSize = uFace.z / uFaceGrid.x * mix(0.45, 1.22, sqrt(aMeta.z));
  float homeSize = mix(poster.z / uPosterGrid.x, faceSize * 0.6, uDust);
  gl_PointSize = max(1.0, mix(homeSize, faceSize, e) * (1.0 + flight * 0.6));
  vSize = gl_PointSize;
  vColor = mix(mix(aSource, aColor, uDust), aColor, smoothstep(0.25, 0.9, e));
  float light = dot(aColor, vec3(0.2126, 0.7152, 0.0722));
  vAlpha = smoothstep(0.0, mix(0.08, 0.6, uDust), t) * mix(1.0, smoothstep(0.02, 0.1, light), e) * (1.0 - uFade);
  vFlight = flight;
}`;

const SWARM_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
in float vFlight;
in float vSize;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float edge = max(1.0 / vSize, vFlight * 0.3);
  float a = smoothstep(0.5, 0.5 - edge, d) * vAlpha;
  vec3 c = pow(vColor, vec3(2.2)) * (1.0 + vFlight * 0.7);
  outColor = vec4(c * a, a);
}`;

const PHOTO_VERTEX = `#version 300 es
uniform vec2 uRes;
uniform vec4 uFace;
out vec2 vUv;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vUv = corner;
  vec2 p = uFace.xy + corner * uFace.zw;
  vec2 clip = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const PHOTO_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPhoto;
uniform sampler2D uMatte;
uniform float uDevelop;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 SILVER = vec3(1.0, 0.985, 0.96);

void main() {
  vec3 c = texture(uPhoto, vUv).rgb;
  vec3 lin = pow(c, vec3(2.2));
  float g = pow(dot(lin, LUMA), 1.0 / 2.2);
  g = clamp((g - 0.035) / 0.93, 0.0, 1.0);
  g = mix(g, g * g * (3.0 - 2.0 * g), 0.45);
  float d = clamp(uDevelop * 1.5 - (1.0 - g) * 0.5, 0.0, 1.0);
  g *= d * d * (3.0 - 2.0 * d);
  vec4 plate = texture(uMatte, vUv);
  float key = smoothstep(0.05, 0.16, distance(c, plate.rgb));
  float edgeOf = length((vUv - vec2(0.5, 0.4)) / vec2(0.5, 0.62));
  float sitter = smoothstep(0.0, 1.0, clamp((1.1 - edgeOf) / 0.75, 0.0, 1.0))
    * mix(1.0, key, plate.a);
  vec2 edge = smoothstep(vec2(0.0), vec2(0.06, 0.04), vUv)
    * smoothstep(vec2(0.0), vec2(0.06, 0.16), 1.0 - vUv);
  float keep = sitter * edge.x * edge.y;
  outColor = vec4(pow(g * SILVER, vec3(2.2)) * keep, 1.0);
}`;

function spawnGatherer(): Worker | null {
  if (typeof Worker !== "function" || typeof OffscreenCanvas !== "function") {
    return null;
  }
  try {
    return new Worker(new URL("./swarm.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return null;
  }
}

export class Portrait {
  private readonly loop: Loop;
  private readonly bloom: Bloom;
  private readonly u;
  private readonly up;
  private readonly photo: WebGLTexture;
  private readonly matte: WebGLTexture;
  private readonly photos = new Map<number, Promise<ImageBitmap | null>>();
  private developed: number | null = null;
  private develop = 0;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffers: WebGLBuffer[];
  private readonly swarms = new Map<number, Promise<Swarm | null>>();
  private swarm: Swarm | null = null;
  private shown: number | null = null;
  private wanted: number | null = null;
  private ready: { photo: ImageBitmap | null; swarm: Swarm | null } | null =
    null;
  private poured: number | null = null;
  private dust = false;
  private phase = 0;
  private readonly boxes = new Float32Array(MAX_FILMS * 4);
  private gatherer = spawnGatherer();
  private readonly jobs = new Map<number, GatherJob>();
  private job = 0;
  private face: PortraitBox | null = null;
  private posters: PortraitBox[] = [];
  private reduced = false;
  private disposed = false;
  private readonly started = performance.now() / 1000;

  static create(
    canvas: HTMLCanvasElement,
    directors: readonly Director[],
    columns: number,
    events: PortraitEvents,
    loop: LoopFactory = createLoop,
  ): Portrait | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    const program = createProgram(gl, SWARM_FRAGMENT, SWARM_VERTEX);
    const photo = createProgram(gl, PHOTO_FRAGMENT, PHOTO_VERTEX);
    const bloom = Bloom.create(gl);
    if (!program || !photo || !bloom) return null;
    return new Portrait(
      canvas,
      gl,
      [program, photo],
      bloom,
      directors,
      columns,
      events,
      loop,
    );
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    private readonly programs: readonly [WebGLProgram, WebGLProgram],
    bloom: Bloom,
    private readonly directors: readonly Director[],
    private readonly columns: number,
    private readonly events: PortraitEvents,
    loop: LoopFactory,
  ) {
    this.bloom = bloom;
    this.u = uniforms(gl, programs[0], PORTRAIT_UNIFORMS);
    this.up = uniforms(gl, programs[1], PORTRAIT_PHOTO_UNIFORMS);
    this.photo = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
    this.matte = createTexture(gl);
    const post = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, post);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    for (const pass of bloom.programs) {
      const location = gl.getAttribLocation(pass, "aPosition");
      if (location < 0) continue;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    }
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.buffers = [2, 2, 3, 3, 3].map((size, location) => {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      return buffer;
    });
    gl.bindVertexArray(null);
    if (this.gatherer) {
      this.gatherer.onmessage = ({ data }: MessageEvent<SwarmReply>) => {
        this.jobs.get(data.job)?.done(data.swarm);
        this.jobs.delete(data.job);
      };
      this.gatherer.onerror = () => {
        this.gatherer?.terminate();
        this.gatherer = null;
        for (const { done, subject } of this.jobs.values()) {
          void gatherSwarm(subject, this.columns).then(done);
        }
        this.jobs.clear();
      };
    }
    this.loop = loop((now, dt) => this.frame(now, dt));
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.loop.wake();
  }

  place(face: PortraitBox, posters: PortraitBox[]): void {
    this.face = face;
    this.posters = posters;
    fitCanvas(this.canvas, 1.75);
    this.loop.wake();
  }

  show(index: number): void {
    if (index !== this.shown && this.shown !== null) {
      if (this.phase === 0 || this.phase === 1) this.dust = true;
    }
    this.wanted = index;
    const count = this.directors.length;
    const far = (kept: number) => {
      const apart = Math.abs(kept - index);
      return Math.min(apart, count - apart) > 1 && kept !== this.shown;
    };
    for (const kept of this.swarms.keys()) {
      if (far(kept)) this.swarms.delete(kept);
    }
    for (const [kept, photo] of this.photos) {
      if (!far(kept)) continue;
      void photo.then((bitmap) => bitmap?.close());
      this.photos.delete(kept);
    }
    this.ready = null;
    void Promise.all([this.gather(index), this.picture(index)]).then(
      ([swarm, photo]) => {
        if (this.wanted !== index || this.disposed) return;
        this.ready = { photo, swarm };
        this.loop.wake();
        const next = (index + 1) % this.directors.length;
        void this.gather(next);
        void this.picture(next);
      },
    );
    this.loop.wake();
  }

  pour(index: number): void {
    this.poured = index;
    this.loop.wake();
  }

  dispose(): void {
    this.disposed = true;
    this.gatherer?.terminate();
    for (const { done } of this.jobs.values()) done(null);
    this.jobs.clear();
    this.loop.dispose();
    this.bloom.dispose();
    for (const buffer of this.buffers) this.gl.deleteBuffer(buffer);
    this.gl.deleteVertexArray(this.vao);
    for (const program of this.programs) this.gl.deleteProgram(program);
    this.gl.deleteTexture(this.photo);
    this.gl.deleteTexture(this.matte);
    for (const bitmap of this.photos.values()) {
      void bitmap.then((image) => image?.close());
    }
    this.photos.clear();
  }

  private gather(index: number): Promise<Swarm | null> {
    let swarm = this.swarms.get(index);
    if (!swarm) {
      const subject = subjectOf(this.directors[index]!);
      const gatherer = this.gatherer;
      swarm = gatherer
        ? new Promise<Swarm | null>((done) => {
            const job = (this.job += 1);
            this.jobs.set(job, { done, subject });
            const request: SwarmRequest = {
              columns: this.columns,
              job,
              subject,
            };
            gatherer.postMessage(request);
          })
        : gatherSwarm(subject, this.columns);
      this.swarms.set(index, swarm);
    }
    return swarm;
  }

  private picture(index: number): Promise<ImageBitmap | null> {
    let photo = this.photos.get(index);
    if (!photo) {
      const src = tmdbImageUrl(
        "profile",
        this.directors[index]!.profilePath,
        "original",
      );
      photo = src ? loadBitmap(src, PORTRAIT_PHOTO) : Promise.resolve(null);
      this.photos.set(index, photo);
    }
    return photo;
  }

  private upload(swarm: Swarm, photo: ImageBitmap | null): void {
    const gl = this.gl;
    [swarm.home, swarm.face, swarm.color, swarm.meta, swarm.source].forEach(
      (data, i) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]!);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      },
    );
    this.swarm = swarm;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, this.matte);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      swarm.faceGrid[0],
      swarm.faceGrid[1],
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      swarm.matte,
    );
    if (photo) {
      gl.bindTexture(gl.TEXTURE_2D, this.photo);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        photo,
      );
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    this.developed = photo ? this.wanted : null;
    this.develop = 0;
  }

  private frame(now: number, dt: number): boolean {
    const gl = this.gl;
    const face = this.face;
    if (!face) return false;
    fitCanvas(this.canvas, 1.75);

    const changing = this.wanted !== null && this.wanted !== this.shown;
    if (changing && this.develop > 0) {
      this.develop = this.reduced
        ? 0
        : Math.max(0, this.develop - dt / PORTRAIT_UNDEVELOP_S);
    } else if (changing) {
      const leave = this.dust ? PORTRAIT_CRUMBLE_S : PORTRAIT_SCATTER_S;
      this.phase = this.reduced ? 0 : Math.max(0, this.phase - dt / leave);
      if (this.phase === 0 && this.ready?.swarm) {
        if (this.shown !== null) this.dust = true;
        this.upload(this.ready.swarm, this.ready.photo);
        this.shown = this.wanted;
        this.events.swapped(this.shown!);
      }
    } else if (this.swarm && this.poured === this.shown) {
      const was = this.phase;
      const gather = this.dust ? PORTRAIT_CONDENSE_S : PORTRAIT_GATHER_S;
      this.phase = this.reduced ? 1 : Math.min(1, this.phase + dt / gather);
      if (was < PORTRAIT_FORMED && this.phase >= PORTRAIT_FORMED)
        this.events.formed(this.shown!);
      if (this.phase === 1 && this.developed === this.shown) {
        this.develop = this.reduced
          ? 1
          : Math.min(1, this.develop + dt / PORTRAIT_DEVELOP_S);
      }
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ratio = width / Math.max(1, this.canvas.clientWidth);
    this.bloom.begin(width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const time = now - this.started;
    const swarm = this.swarm;
    const box = [
      face.x * ratio,
      face.y * ratio,
      face.width * ratio,
      face.height * ratio,
    ] as const;
    const develop = this.develop * this.develop * (3 - 2 * this.develop);
    if (swarm && this.posters.length > 0 && develop < 1) {
      gl.useProgram(this.programs[0]);
      const u = this.u;
      gl.uniform2f(u.uRes, width, height);
      gl.uniform4f(u.uFace, ...box);
      const films = Math.min(MAX_FILMS, this.posters.length);
      for (let f = 0; f < films; f += 1) {
        const poster = this.posters[f]!;
        this.boxes[f * 4] = poster.x * ratio;
        this.boxes[f * 4 + 1] = poster.y * ratio;
        this.boxes[f * 4 + 2] = poster.width * ratio;
        this.boxes[f * 4 + 3] = poster.height * ratio;
      }
      gl.uniform4fv(u.uPosters, this.boxes, 0, films * 4);
      gl.uniform1f(u.uPhase, this.phase);
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uFaceGrid, ...swarm.faceGrid);
      gl.uniform2f(u.uPosterGrid, ...swarm.posterGrid);
      gl.uniform1f(u.uScale, ratio);
      gl.uniform1f(u.uDust, this.dust ? 1 : 0);
      gl.uniform1f(u.uFade, develop);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.POINTS, 0, swarm.count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
    if (swarm && develop > 0) {
      gl.useProgram(this.programs[1]);
      const u = this.up;
      gl.uniform2f(u.uRes, width, height);
      gl.uniform4f(u.uFace, ...box);
      gl.uniform1f(u.uDevelop, develop);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.photo);
      gl.uniform1i(u.uPhoto, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.matte);
      gl.uniform1i(u.uMatte, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
    }
    this.bloom.present(PORTRAIT_LOOK, time);

    const developing =
      this.developed === this.shown && this.phase === 1 && this.develop < 1;
    return (
      changing ||
      developing ||
      (this.swarm !== null && this.poured === this.shown && this.phase < 1)
    );
  }
}
