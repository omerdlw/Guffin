import { tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  BACKDROP_REACH,
  BACKDROP_SPAN,
  BACKDROP_STEP,
  SWARM_LATTICE,
} from "./constants";
import { loadBitmap } from "./gl";
import type { Swarm, SwarmSubject } from "./types";
import {
  encoded,
  lightAt,
  oklab,
  pixelsOf,
  random,
  soften,
  vignetteAt,
} from "./utils";

export async function gatherSwarm(
  director: SwarmSubject,
  columns: number,
  signal?: AbortSignal,
): Promise<Swarm | null> {
  const faceGrid: [number, number] = [
    columns,
    Math.round((columns * 1.5) / SWARM_LATTICE),
  ];
  const cells = faceGrid[0] * faceGrid[1];
  const profile = tmdbImageUrl("profile", director.profilePath, "h632");
  const [portrait, ...posters] = await Promise.all([
    profile ? loadBitmap(profile, { signal }) : null,
    ...director.films.map((film) => {
      const src = tmdbImageUrl("poster", film.posterPath, "w92");
      return src ? loadBitmap(src, { signal }) : null;
    }),
  ]);
  if (!portrait || signal?.aborted) return null;

  const films = posters.flatMap((bitmap, film) =>
    bitmap ? [{ bitmap, film }] : [],
  );
  if (films.length === 0) return null;
  const per = Math.floor(cells / films.length);
  const rows = Math.round(Math.sqrt(per * 1.5));
  const posterGrid: [number, number] = [Math.floor(per / rows), rows];
  const samples = posterGrid[0] * posterGrid[1];
  const count = samples * films.length;

  const face = pixelsOf(portrait, faceGrid[0], faceGrid[1]);
  portrait.close();
  if (!face) return null;
  const [columnsOf, rowsOf] = faceGrid;
  const rgb = (i: number, c: number) => face[i * 4 + c]! / 255;
  const between = (i: number, j: number) =>
    Math.hypot(
      rgb(i, 0) - rgb(j, 0),
      rgb(i, 1) - rgb(j, 1),
      rgb(i, 2) - rgb(j, 2),
    );
  const seeds: number[] = [];
  for (let x = 0; x < columnsOf; x += 1) seeds.push(x);
  for (let y = 1; y < rowsOf * 0.7; y += 1) {
    seeds.push(y * columnsOf, y * columnsOf + columnsOf - 1);
  }
  const behind = [0, 1, 2].map(
    (c) => seeds.reduce((sum, i) => sum + rgb(i, c), 0) / seeds.length,
  );
  const apart = (i: number) =>
    Math.hypot(
      rgb(i, 0) - behind[0]!,
      rgb(i, 1) - behind[1]!,
      rgb(i, 2) - behind[2]!,
    );
  const backdropped = new Uint8Array(cells);
  const queue = new Int32Array(cells);
  let tail = 0;
  const reach = (i: number, from: number) => {
    if (backdropped[i] || apart(i) >= BACKDROP_SPAN) return;
    if (between(i, from) >= BACKDROP_STEP) return;
    backdropped[i] = 1;
    queue[tail++] = i;
  };
  for (const i of seeds) {
    if (backdropped[i] || apart(i) >= BACKDROP_REACH) continue;
    backdropped[i] = 1;
    queue[tail++] = i;
  }
  for (let head = 0; head < tail; head += 1) {
    const i = queue[head]!;
    const x = i % columnsOf;
    if (x > 0) reach(i - 1, i);
    if (x < columnsOf - 1) reach(i + 1, i);
    if (i >= columnsOf) reach(i - columnsOf, i);
    if (i + columnsOf < cells) reach(i + columnsOf, i);
  }
  const plate = [0, 1, 2].map(() => new Float32Array(cells));
  const near = new Float32Array(cells);
  for (let i = 0; i < cells; i += 1) {
    if (!backdropped[i]) continue;
    for (let c = 0; c < 3; c += 1) plate[c]![i] = rgb(i, c);
    near[i] = 1;
  }
  for (const field of [...plate, near]) soften(field, columnsOf, rowsOf, 4);
  const plateAt = (i: number, c: number) =>
    near[i]! > 1e-3 ? plate[c]![i]! / near[i]! : behind[c]!;

  const faceLight = new Float32Array(cells);
  for (let i = 0; i < cells; i += 1) {
    const u = ((i % columnsOf) + 0.5) / columnsOf;
    const v = (Math.floor(i / columnsOf) + 0.5) / rowsOf;
    const sitter = backdropped[i]
      ? Math.min(
          1,
          Math.max(
            0,
            (Math.hypot(
              rgb(i, 0) - plateAt(i, 0),
              rgb(i, 1) - plateAt(i, 1),
              rgb(i, 2) - plateAt(i, 2),
            ) -
              0.07) /
              0.16,
          ),
        )
      : 1;
    faceLight[i] =
      lightAt(face, i) * vignetteAt(u, v) * sitter * sitter * (3 - 2 * sitter);
  }
  const sortedLight = Float32Array.from(faceLight).sort();
  const floor = sortedLight[Math.floor(cells * 0.04)]!;
  const ceiling = sortedLight[Math.floor(cells * 0.985)]! || 1;
  for (let i = 0; i < cells; i += 1) {
    const t = Math.min(
      1,
      Math.max(0, (faceLight[i]! - floor) / (ceiling - floor)),
    );
    faceLight[i] = t ** 1.15;
  }

  const sourcePixels: Uint8ClampedArray[] = [];
  for (const { bitmap } of films) {
    sourcePixels.push(
      pixelsOf(bitmap, posterGrid[0], posterGrid[1]) ??
        new Uint8ClampedArray(samples * 4),
    );
    bitmap.close();
  }
  const sourceLab = new Float32Array(count * 3);
  for (let f = 0; f < films.length; f += 1) {
    const pixels = sourcePixels[f]!;
    for (let s = 0; s < samples; s += 1) {
      sourceLab.set(
        oklab(
          pixels[s * 4]! / 255,
          pixels[s * 4 + 1]! / 255,
          pixels[s * 4 + 2]! / 255,
        ),
        (f * samples + s) * 3,
      );
    }
  }
  const hueOf = (i: number) =>
    Math.atan2(sourceLab[i * 3 + 2]!, sourceLab[i * 3 + 1]!);
  const sweep = (cell: number) =>
    (cell % columnsOf) / columnsOf +
    (Math.floor(cell / columnsOf) / rowsOf) * 0.6;

  const byFace = Array.from({ length: cells }, (_, i) => i).sort(
    (a, b) => faceLight[a]! - faceLight[b]!,
  );
  const bySource = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => sourceLab[a * 3]! - sourceLab[b * 3]!,
  );
  const lit = byFace.slice(cells - count);
  const BAND = 640;
  for (let start = 0; start < count; start += BAND) {
    const end = Math.min(count, start + BAND);
    const faces = lit.slice(start, end).sort((a, b) => sweep(a) - sweep(b));
    const sources = bySource
      .slice(start, end)
      .sort((a, b) => hueOf(a) - hueOf(b));
    lit.splice(start, faces.length, ...faces);
    bySource.splice(start, sources.length, ...sources);
  }

  const home = new Float32Array(count * 2);
  const faceAt = new Float32Array(count * 2);
  const color = new Float32Array(count * 3);
  const source = new Float32Array(count * 3);
  const meta = new Float32Array(count * 3);
  const next = random(director.id);
  for (let k = 0; k < count; k += 1) {
    const cell = lit[k]!;
    const from = bySource[k]!;
    const f = Math.floor(from / samples);
    const s = from % samples;
    home.set(
      [
        ((s % posterGrid[0]) + 0.5) / posterGrid[0],
        (Math.floor(s / posterGrid[0]) + 0.5) / posterGrid[1],
      ],
      k * 2,
    );
    const row = Math.floor(cell / faceGrid[0]);
    faceAt.set(
      [
        ((cell % faceGrid[0]) + 0.25 + (row % 2) * 0.5) / faceGrid[0],
        (row + 0.5) / faceGrid[1],
      ],
      k * 2,
    );
    const pixels = sourcePixels[f]!;
    source.set(
      [0, 1, 2].map((c) => pixels[s * 4 + c]! / 255),
      k * 3,
    );
    const light = faceLight[cell]!;
    const grey = encoded((0.05 + light * 0.82) ** 3);
    color.set([grey, grey * 0.985, grey * 0.96], k * 3);
    meta.set([films[f]!.film, next(), light], k * 3);
  }

  const matte = new Uint8Array(cells * 4);
  for (let i = 0; i < cells; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      matte[i * 4 + c] = Math.round(plateAt(i, c) * 255);
    }
    matte[i * 4 + 3] = Math.round(Math.min(1, near[i]! * 4) * 255);
  }

  return {
    color,
    count,
    face: faceAt,
    faceGrid,
    matte,
    home,
    meta,
    posterGrid,
    source,
  };
}
