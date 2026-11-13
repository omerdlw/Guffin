import type {
  CanonFilm,
  FilmMarks,
  Loop,
  LoopFactory,
} from "@/features/spotlights/spotlights";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { loadBitmap } from "./bloom";

interface TunnelEvents {
  hovered(index: number): void;
  opened(): void;
  selected(index: number): void;
}

interface TunnelSlot {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface TunnelPrint {
  color: ImageBitmap;
  gray: ImageBitmap;
  tint: readonly [number, number, number];
}

const TUNNEL_PERSPECTIVE = 0.55;

const TUNNEL_REACH = 9;

const TUNNEL_ENVELOPE = 1.1;

const TUNNEL_SWING = { x: 1.15, y: 0.3 };

const TUNNEL_PASS = 0.9;

const TUNNEL_GOLDEN = 2.399963;

const TUNNEL_DUST = 150;

const TUNNEL_WHEEL = 1 / 260;

const TUNNEL_DRAG = 1 / 230;

const TUNNEL_SWAY = { pixels: 14, seconds: 0.5 };

const TUNNEL_RATE = { drag: 22, free: 8, snap: 6 };

const TUNNEL_SNAP_MS = 110;

const TUNNEL_FLING_S = 0.18;

const TUNNEL_ARRIVE_S = 1.1;

const TUNNEL_OPEN_READY = 6;

const TUNNEL_OPEN_PATIENCE_MS = 2500;

const TUNNEL_LOADS = 4;

const TUNNEL_SHARP_WAIT_MS = 140;

const TUNNEL_SHARP_KEPT = 4;

const TUNNEL_CLICK_SLOP = 6;

const TUNNEL_FADE_S = 0.35;

const smooth = (t: number) => t * t * (3 - 2 * t);

const clamp = (value: number, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));

function settleTarget(from: number, to: number): number {
  const moved = to - from;
  if (Math.abs(moved) < 0.08) return from;
  return from + Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
}

function stepFrom(
  from: number,
  direction: -1 | 1,
  count: number,
  matches: (index: number) => boolean,
): number {
  const plain = clamp(from - direction, 0, count - 1);
  for (let at = from - direction; at >= 0 && at < count; at -= direction) {
    if (matches(at)) return at;
  }
  return plain;
}

const approach = (from: number, to: number, time: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / Math.max(1e-4, time / 4));

const POSTER = 2 / 3;
const NEUTRAL: readonly [number, number, number] = [150, 150, 160];

interface Hit {
  alpha: number;
  height: number;
  index: number;
  left: number;
  top: number;
  width: number;
}

interface Hand {
  axis: "x" | "y" | null;
  at: number;
  dx: number;
  dy: number;
  moved: number;
  velocity: number;
  x: number;
  y: number;
}

const scaleAt = (depth: number) =>
  depth >= 0
    ? 1 / (1 + depth * TUNNEL_PERSPECTIVE)
    : 1 - depth * TUNNEL_PERSPECTIVE;

const wrap = (value: number, by: number) => ((value % by) + by) % by;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function develop(bitmap: ImageBitmap): Promise<TunnelPrint> {
  const fallback = { color: bitmap, gray: bitmap, tint: NEUTRAL };
  if (typeof OffscreenCanvas === "undefined") return fallback;
  const { height, width } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback;
  try {
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let total = 0;
    let sample = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!;
      const g = pixels[i + 1]!;
      const b = pixels[i + 2]!;
      if (sample++ % 7 === 0) {
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        const weight = 1 + (spread * spread) / 64;
        red += r * weight;
        green += g * weight;
        blue += b * weight;
        total += weight;
      }
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = luma;
    }
    context.putImageData(image, 0, 0);
    const gray = await createImageBitmap(canvas);
    const peak = Math.max(red, green, blue, 1) / Math.max(total, 1);
    const lift = 230 / peak;
    const channel = (value: number) =>
      Math.min(255, Math.round((value / Math.max(total, 1)) * lift));
    return {
      color: bitmap,
      gray,
      tint: [channel(red), channel(green), channel(blue)],
    };
  } catch {
    return fallback;
  }
}

export class Tunnel {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly loop: Loop;
  private readonly prints: (TunnelPrint | null)[];
  private readonly loading = new Set<number>();
  private readonly failed = new Set<number>();
  private readonly sharp = new Map<number, ImageBitmap>();
  private readonly seenMix: number[];
  private readonly matchMix: number[];
  private readonly hits: Hit[] = [];
  private readonly dust: Float32Array;
  private readonly count: number;

  private marks: FilmMarks[] | null = null;
  private ink: readonly [number, number, number] = [255, 255, 255];
  private slot: TunnelSlot = { height: 1, left: 0, top: 0, width: 1 };
  private pos: number;
  private target: number;
  private near: number;
  private base: number | null = null;
  private lastInput = 0;
  private hand: Hand | null = null;
  private pointer: { x: number; y: number } | null = null;
  private sway = { x: 0, y: 0 };
  private hover = -1;
  private time = 0;
  private arrive = 0;
  private loaded = 0;
  private ready = false;
  private opened = false;
  private reduced = false;
  private disposed = false;
  private sharpTimer: ReturnType<typeof setTimeout> | null = null;
  private sharpAbort: AbortController | null = null;
  private readonly patience: ReturnType<typeof setTimeout>;

  static create(
    canvas: HTMLCanvasElement,
    films: readonly CanonFilm[],
    start: number,
    events: TunnelEvents,
    loop: LoopFactory,
  ): Tunnel | null {
    const ctx = canvas.getContext("2d");
    if (!ctx || films.length === 0) return null;
    return new Tunnel(canvas, ctx, films, start, events, loop);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    private readonly films: readonly CanonFilm[],
    start: number,
    private readonly events: TunnelEvents,
    loop: LoopFactory,
  ) {
    this.ctx = ctx;
    this.count = films.length;
    this.prints = films.map(() => null);
    this.seenMix = films.map(() => 1);
    this.matchMix = films.map(() => 1);
    this.pos = this.target = this.near = clamp(start, 0, this.count - 1);
    this.dust = new Float32Array(TUNNEL_DUST * 5);
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < TUNNEL_DUST; i += 1) {
      this.dust[i * 5] = random() * Math.PI * 2;
      this.dust[i * 5 + 1] = 0.08 + Math.sqrt(random()) * 0.92;
      this.dust[i * 5 + 2] = random() * TUNNEL_REACH;
      this.dust[i * 5 + 3] = 0.5 + random() * 1.1;
      this.dust[i * 5 + 4] = random() * Math.PI * 2;
    }
    this.loop = loop((now, dt) => this.frame(now, dt));
    this.patience = setTimeout(() => this.open(), TUNNEL_OPEN_PATIENCE_MS);
    this.pump();
    this.sharpLater();
    this.loop.wake();
  }

  get selected(): number {
    return this.near;
  }

  setSlot(slot: TunnelSlot): void {
    this.slot = slot;
    this.loop.wake();
  }

  setInk(ink: readonly [number, number, number]): void {
    this.ink = ink;
    this.loop.wake();
  }

  setMarks(marks: FilmMarks[] | null): void {
    this.marks = marks;
    this.loop.wake();
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    if (reduced) this.arrive = this.ready ? 1 : 0;
    this.loop.wake();
  }

  point(x: number | null, y: number | null): void {
    this.pointer = x === null || y === null ? null : { x, y };
    this.loop.wake();
  }

  select(index: number, glide = true): void {
    this.base = null;
    this.target = clamp(Math.round(index), 0, this.count - 1);
    if (!glide) this.pos = this.target;
    this.loop.wake();
  }

  step(direction: -1 | 1): void {
    this.base = null;
    const from = Math.round(this.target);
    this.target = stepFrom(from, direction, this.count, (index) =>
      this.marks ? this.marks[index]!.match : true,
    );
    this.loop.wake();
  }

  scroll(dx: number, dy: number): void {
    const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    this.push(delta * TUNNEL_WHEEL);
    this.lastInput = performance.now();
  }

  grab(x: number, y: number): void {
    this.hand = {
      at: performance.now(),
      axis: null,
      dx: 0,
      dy: 0,
      moved: 0,
      velocity: 0,
      x,
      y,
    };
    this.base = null;
    this.loop.wake();
  }

  drag(x: number, y: number): void {
    const hand = this.hand;
    if (!hand) return;
    const dx = x - hand.x;
    const dy = y - hand.y;
    const now = performance.now();
    hand.x = x;
    hand.y = y;
    hand.dx += dx;
    hand.dy += dy;
    hand.moved += Math.abs(dx) + Math.abs(dy);
    if (!hand.axis && hand.moved > TUNNEL_CLICK_SLOP) {
      hand.axis = Math.abs(hand.dx) > Math.abs(hand.dy) ? "x" : "y";
    }
    if (hand.axis) {
      const advance = -(hand.axis === "x" ? dx : dy) * TUNNEL_DRAG;
      const seconds = Math.max(0.008, (now - hand.at) / 1000);
      hand.velocity = hand.velocity * 0.6 + (advance / seconds) * 0.4;
      this.target = clamp(this.target - advance, 0, this.count - 1);
    }
    hand.at = now;
    this.loop.wake();
  }

  drop(): boolean {
    const hand = this.hand;
    this.hand = null;
    if (!hand) return false;
    if (hand.moved <= TUNNEL_CLICK_SLOP) return true;
    const rested = performance.now() - hand.at > 90 ? 0 : hand.velocity;
    this.target = clamp(
      Math.round(this.target - rested * TUNNEL_FLING_S),
      0,
      this.count - 1,
    );
    this.loop.wake();
    return false;
  }

  filmAt(x: number, y: number): number {
    for (let i = this.hits.length - 1; i >= 0; i -= 1) {
      const hit = this.hits[i]!;
      if (
        hit.alpha > 0.2 &&
        x >= hit.left &&
        x <= hit.left + hit.width &&
        y >= hit.top &&
        y <= hit.top + hit.height
      ) {
        return hit.index;
      }
    }
    return -1;
  }

  dispose(): void {
    this.disposed = true;
    this.loop.dispose();
    clearTimeout(this.patience);
    if (this.sharpTimer) clearTimeout(this.sharpTimer);
    this.sharpAbort?.abort();
    for (const print of this.prints) {
      if (print?.gray && print.gray !== print.color) print.gray.close();
      print?.color.close();
    }
    for (const bitmap of this.sharp.values()) bitmap.close();
    this.sharp.clear();
  }

  private push(advance: number): void {
    if (this.base === null) this.base = Math.round(this.target);
    this.target = clamp(this.target - advance, 0, this.count - 1);
    this.loop.wake();
  }

  private open(): void {
    if (this.ready || this.disposed) return;
    this.ready = true;
    if (this.reduced) this.arrive = 1;
    if (!this.opened) {
      this.opened = true;
      this.events.opened();
    }
    this.loop.wake();
  }

  private pump(): void {
    while (this.loading.size < TUNNEL_LOADS) {
      let best = -1;
      let distance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < this.count; i += 1) {
        if (this.prints[i] || this.loading.has(i) || this.failed.has(i)) {
          continue;
        }
        const away = Math.abs(i - this.near);
        if (away < distance) {
          distance = away;
          best = i;
        }
      }
      if (best < 0) return;
      void this.load(best);
    }
  }

  private async load(index: number): Promise<void> {
    this.loading.add(index);
    const src = tmdbImageUrl("poster", this.films[index]!.posterPath, "w342");
    const bitmap = src ? await loadBitmap(src) : null;
    const print = bitmap && !this.disposed ? await develop(bitmap) : null;
    this.loading.delete(index);
    if (this.disposed) {
      print?.color.close();
      return;
    }
    if (print) {
      this.prints[index] = print;
      this.loaded += 1;
      if (this.loaded >= Math.min(TUNNEL_OPEN_READY, this.count)) this.open();
    } else {
      bitmap?.close();
      this.failed.add(index);
    }
    this.pump();
    this.loop.wake();
  }

  private sharpLater(): void {
    if (this.sharpTimer) clearTimeout(this.sharpTimer);
    this.sharpTimer = setTimeout(
      () => void this.loadSharp(this.near),
      TUNNEL_SHARP_WAIT_MS,
    );
  }

  private async loadSharp(index: number): Promise<void> {
    if (this.disposed || this.sharp.has(index)) return;
    const src = tmdbImageUrl("poster", this.films[index]!.posterPath, "w780");
    if (!src) return;
    this.sharpAbort?.abort();
    const abort = new AbortController();
    this.sharpAbort = abort;
    const bitmap = await loadBitmap(src, { signal: abort.signal });
    if (this.sharpAbort === abort) this.sharpAbort = null;
    if (!bitmap || this.disposed) {
      bitmap?.close();
      return;
    }
    this.sharp.set(index, bitmap);
    for (const key of this.sharp.keys()) {
      if (this.sharp.size <= TUNNEL_SHARP_KEPT) break;
      if (key === this.near) continue;
      this.sharp.get(key)?.close();
      this.sharp.delete(key);
    }
    this.loop.wake();
  }

  private frame(now: number, rawDelta: number): boolean {
    if (this.disposed) return false;
    const dt = Math.min(rawDelta, 0.05);
    if (!this.reduced) this.time += dt;

    if (this.ready) {
      this.arrive = this.reduced
        ? 1
        : Math.min(1, this.arrive + dt / TUNNEL_ARRIVE_S);
    }

    if (
      !this.hand &&
      this.base !== null &&
      performance.now() - this.lastInput > TUNNEL_SNAP_MS
    ) {
      this.target = clamp(
        settleTarget(this.base, this.target),
        0,
        this.count - 1,
      );
      this.base = null;
    }

    const rate = this.hand
      ? TUNNEL_RATE.drag
      : this.base !== null
        ? TUNNEL_RATE.free
        : TUNNEL_RATE.snap;
    this.pos = this.reduced
      ? this.target
      : this.pos + (this.target - this.pos) * (1 - Math.exp(-rate * dt));
    if (Math.abs(this.target - this.pos) < 0.0004) this.pos = this.target;

    const near = clamp(Math.round(this.pos), 0, this.count - 1);
    if (near !== this.near) {
      this.near = near;
      this.events.selected(near);
      this.pump();
      this.sharpLater();
    }

    for (let i = 0; i < this.count; i += 1) {
      const mark = this.marks?.[i];
      this.seenMix[i] = approach(
        this.seenMix[i]!,
        mark ? (mark.seen ? 1 : 0) : 1,
        this.reduced ? 0 : TUNNEL_FADE_S,
        dt,
      );
      this.matchMix[i] = approach(
        this.matchMix[i]!,
        mark ? (mark.match ? 1 : 0) : 1,
        this.reduced ? 0 : TUNNEL_FADE_S,
        dt,
      );
    }

    const aimX = this.pointer
      ? (this.pointer.x / Math.max(1, this.canvas.clientWidth) - 0.5) *
        -2 *
        TUNNEL_SWAY.pixels
      : 0;
    const aimY = this.pointer
      ? (this.pointer.y / Math.max(1, this.canvas.clientHeight) - 0.5) *
        -2 *
        TUNNEL_SWAY.pixels
      : 0;
    const follow = this.reduced
      ? 0
      : 1 - Math.exp(-dt / (TUNNEL_SWAY.seconds / 4));
    this.sway.x += (aimX - this.sway.x) * follow;
    this.sway.y += (aimY - this.sway.y) * follow;

    this.draw(now);
    this.hoverAt();
    return true;
  }

  private hoverAt(): void {
    const index =
      this.pointer && !this.hand
        ? this.filmAt(this.pointer.x, this.pointer.y)
        : -1;
    if (index === this.hover) return;
    this.hover = index;
    this.events.hovered(index);
  }

  private tintAt(): readonly [number, number, number] {
    const low = clamp(Math.floor(this.pos), 0, this.count - 1);
    const high = clamp(low + 1, 0, this.count - 1);
    const mix = clamp(this.pos - low);
    const a = this.prints[low]?.tint ?? NEUTRAL;
    const b = this.prints[high]?.tint ?? NEUTRAL;
    return [
      a[0] + (b[0] - a[0]) * mix,
      a[1] + (b[1] - a[1]) * mix,
      a[2] + (b[2] - a[2]) * mix,
    ];
  }

  private draw(_now: number): void {
    const { canvas, ctx } = this;
    const ratio =
      canvas.clientWidth > 0 ? canvas.width / canvas.clientWidth : 1;
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
    this.hits.length = 0;

    const slot = this.slot;
    const posterH = Math.min(slot.height, slot.width / POSTER);
    const posterW = posterH * POSTER;
    const vx = slot.left + slot.width / 2 + this.sway.x;
    const vy = slot.top + slot.height / 2 + this.sway.y;
    const arrive = smooth(this.arrive);
    const lift = 1 + 0.1 * (1 - arrive);
    const [tr, tg, tb] = this.tintAt().map(Math.round) as [
      number,
      number,
      number,
    ];

    const glow = ctx.createRadialGradient(
      vx,
      vy,
      0,
      vx,
      vy,
      Math.max(width, height) * 0.75,
    );
    glow.addColorStop(0, `rgba(${tr},${tg},${tb},${0.22 * arrive})`);
    glow.addColorStop(0.4, `rgba(${tr},${tg},${tb},${0.07 * arrive})`);
    glow.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    this.drawGates(vx, vy, width, height, lift, arrive);
    this.drawDust(false, vx, vy, width, height, lift, arrive, [tr, tg, tb]);

    const first = Math.max(0, Math.floor(this.pos - TUNNEL_REACH));
    const last = Math.min(this.count - 1, Math.ceil(this.pos + 1));
    for (let i = first; i <= last; i += 1) {
      this.drawPoster(i, vx, vy, posterW, posterH, lift, arrive);
    }

    this.drawDust(true, vx, vy, width, height, lift, arrive, [tr, tg, tb]);
    ctx.globalAlpha = 1;
  }

  private drawGates(
    vx: number,
    vy: number,
    width: number,
    height: number,
    lift: number,
    arrive: number,
  ): void {
    const { ctx } = this;
    const from = Math.ceil(this.pos - 0.5 - TUNNEL_REACH);
    const to = Math.floor(this.pos - 0.55);
    ctx.lineWidth = 1;
    for (let i = from; i <= to; i += 1) {
      const depth = this.pos - i - 0.5;
      const s = scaleAt(depth) * lift;
      const alpha =
        0.12 * Math.pow(1 - depth / TUNNEL_REACH, 1.5) * arrive * clamp(depth);
      if (alpha < 0.004) continue;
      const w = width * 1.45 * s;
      const h = height * 1.45 * s;
      ctx.strokeStyle = `rgba(${this.ink[0]},${this.ink[1]},${this.ink[2]},${alpha})`;
      roundedRect(ctx, vx - w / 2, vy - h / 2, w, h, 18 * s);
      ctx.stroke();
    }
  }

  private drawDust(
    front: boolean,
    vx: number,
    vy: number,
    width: number,
    height: number,
    lift: number,
    arrive: number,
    tint: readonly number[],
  ): void {
    const { ctx, dust } = this;
    const reach = Math.max(width, height) * 0.9;
    const r = Math.round((tint[0]! + this.ink[0]) / 2);
    const g = Math.round((tint[1]! + this.ink[1]) / 2);
    const b = Math.round((tint[2]! + this.ink[2]) / 2);
    for (let i = 0; i < TUNNEL_DUST; i += 1) {
      const depth = wrap(
        dust[i * 5 + 2]! + this.pos - this.time * 0.3,
        TUNNEL_REACH,
      );
      if (depth < 1 !== front) continue;
      const s = scaleAt(depth) * lift;
      const angle = dust[i * 5]!;
      const radius = dust[i * 5 + 1]! * reach * s;
      const twinkle = 0.6 + 0.4 * Math.sin(this.time * 1.3 + dust[i * 5 + 4]!);
      const alpha =
        0.5 *
        twinkle *
        (1 - depth / TUNNEL_REACH) *
        smooth(clamp(depth / 0.5)) *
        arrive;
      if (alpha < 0.01) continue;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(
        vx + Math.cos(angle) * radius,
        vy + Math.sin(angle) * radius,
        dust[i * 5 + 3]! * (0.6 + s * 2.2),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawPoster(
    index: number,
    vx: number,
    vy: number,
    posterW: number,
    posterH: number,
    lift: number,
    arrive: number,
  ): void {
    const { ctx } = this;
    const depth = this.pos - index;
    if (depth < -TUNNEL_PASS) return;
    const s = scaleAt(depth) * lift;
    const angle = index * TUNNEL_GOLDEN;
    const side = Math.cos(angle) >= 0 ? 1 : -1;

    let offsetX: number;
    let offsetY: number;
    let fog: number;
    if (depth >= 0) {
      const envelope = smooth(clamp(depth / TUNNEL_ENVELOPE));
      offsetX = Math.cos(angle) * TUNNEL_SWING.x * posterW * envelope;
      offsetY = Math.sin(angle) * TUNNEL_SWING.y * posterH * envelope;
      fog = Math.pow(1 - clamp(depth / TUNNEL_REACH), 1.4);
      fog *= 1 - 0.3 * clamp(depth / 2);
    } else {
      const gone = smooth(clamp(-depth / TUNNEL_PASS));
      offsetX = side * posterW * 1.5 * gone;
      offsetY = Math.sin(angle) * posterH * 0.2 * gone;
      fog = 1 - gone;
    }

    const focal = 1 - smooth(clamp(Math.abs(depth) / 0.7));
    const matched = this.matchMix[index]!;
    const alpha = fog * arrive * Math.max(0.3 + 0.7 * matched, focal * 0.75, 0);
    if (alpha < 0.01) return;

    const w = posterW * s;
    const h = posterH * s;
    const left = vx + offsetX * s - w / 2;
    const top = vy + offsetY * s - h / 2;
    const radius = 6 * s;
    this.hits.push({ alpha, height: h, index, left, top, width: w });

    const print = this.prints[index];
    ctx.save();
    roundedRect(ctx, left, top, w, h, radius);
    ctx.clip();
    if (!print) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgba(${this.ink[0]},${this.ink[1]},${this.ink[2]},0.06)`;
      ctx.fillRect(left, top, w, h);
    } else {
      const mix = this.marks ? clamp(Math.max(this.seenMix[index]!, focal)) : 1;
      if (mix < 1) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(print.gray, left, top, w, h);
      }
      if (mix > 0) {
        const color =
          focal > 0.5 ? (this.sharp.get(index) ?? print.color) : print.color;
        ctx.globalAlpha = alpha * mix;
        ctx.drawImage(color, left, top, w, h);
      }
    }
    ctx.restore();

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(${this.ink[0]},${this.ink[1]},${this.ink[2]},0.16)`;
    ctx.lineWidth = 1;
    roundedRect(
      ctx,
      left + 0.5,
      top + 0.5,
      Math.max(0, w - 1),
      Math.max(0, h - 1),
      radius,
    );
    ctx.stroke();

    if (this.marks?.[index]?.seen && s > 0.45 && alpha > 0.25) {
      const size = 11 * s;
      const cx = left + w - 10 * s - size;
      const cy = top + 10 * s + size;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = Math.max(1.2, 1.8 * s);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.42, cy + size * 0.02);
      ctx.lineTo(cx - size * 0.1, cy + size * 0.34);
      ctx.lineTo(cx + size * 0.45, cy - size * 0.3);
      ctx.stroke();
    }
  }
}
