import { type PersonCrewCredit, tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  DIRECTOR_KNOWN_VOTES,
  DIRECTORS_GAP,
  DIRECTORS_MAX_TILE,
  DIRECTORS_PRINT_STEP_S,
  DIRECTORS_PRINT_WINDOW_S,
  FIRST_CEREMONY_YEAR,
  GENRE_LABELS,
  MAX_FILMS,
  SPOTLIGHT_LOGLINE_LENGTH,
  SWARM_LUMA,
  WALL_COLUMNS,
  WALL_GAP,
  WALL_RATIO,
} from "./constants";
import type {
  CatalogHit,
  Director,
  DirectorFilm,
  GridFit,
  Laureate,
  PortraitBox,
  SwarmSubject,
  Vec2,
  WallViewport,
} from "./types";

export const genreNames = (ids: readonly number[]) =>
  ids.flatMap((id) => (GENRE_LABELS[id] ? [GENRE_LABELS[id]] : [])).slice(0, 3);

export const ceremonyYear = (ceremony: number) =>
  FIRST_CEREMONY_YEAR + ceremony - (ceremony >= 3 && ceremony <= 5 ? 2 : 1);

export function ordinal(value: number): string {
  const tail = value % 100;
  if (tail >= 11 && tail <= 13) return `${value}th`;
  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

export const lifeSpanOf = (director: Director) =>
  director.died ? `${director.born}–${director.died}` : `Born ${director.born}`;

export const boxOf = (element: Element): PortraitBox => {
  const box = element.getBoundingClientRect();
  return { height: box.height, width: box.width, x: box.left, y: box.top };
};

const diagonals = (count: number, columns: number) =>
  Math.max(1, Math.ceil(count / columns) + columns - 2);

export const sweepOf = (count: number, columns: number) =>
  Math.min(
    DIRECTORS_PRINT_WINDOW_S,
    diagonals(count, columns) * DIRECTORS_PRINT_STEP_S,
  );

export function wavePlaces(count: number, columns: number, tile: number) {
  const across = tile + DIRECTORS_GAP;
  const down = tile * 1.5 + DIRECTORS_GAP;
  const reach = (i: number) =>
    (i % columns) * across + Math.floor(i / columns) * down;
  const far = Math.max(1, reach(count - 1), reach(columns - 1));
  return Array.from({ length: count }, (_, i) => reach(i) / far);
}

export const wait = (seconds: number) =>
  new Promise<void>((done) => setTimeout(done, seconds * 1000));

export function fitGrid(width: number, height: number, count: number): GridFit {
  let best: GridFit = { columns: count, tile: 1 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const across = (width - DIRECTORS_GAP * (columns - 1)) / columns;
    const down = (height - DIRECTORS_GAP * (rows - 1)) / rows / 1.5;
    const tile = Math.floor(Math.min(DIRECTORS_MAX_TILE, across, down));
    if (tile > best.tile) best = { columns, tile };
  }
  return best;
}

export const sameFit = (a: GridFit | null, b: GridFit) =>
  a?.columns === b.columns && a.tile === b.tile;

export const smooth = (t: number) => t * t * (3 - 2 * t);

export function pitches(pitch: number): Vec2 {
  const inner = pitch * (1 - WALL_GAP);
  return [inner * WALL_RATIO + pitch * WALL_GAP, pitch];
}

export function wallAt(view: WallViewport, x: number, y: number): Vec2 {
  const cx = (x - view.width / 2) / view.height;
  const cy = (y - view.height / 2) / view.height;
  const dx = cx - view.focus[0];
  const dy = cy - view.focus[1];
  const g = Math.exp(-(dx * dx + dy * dy) / (view.radius * view.radius));
  const lx = view.focus[0] + dx * (1 - view.lens * g);
  const ly = view.focus[1] + dy * (1 - view.lens * g);
  const bow = 1 + view.bulge * (lx * lx + ly * ly);
  const [px, py] = pitches(view.pitch);
  return [
    (lx * bow * view.height) / px + view.pan[0],
    (ly * bow * view.height) / py + view.pan[1],
  ];
}

const wrapMod = (value: number, by: number) => ((value % by) + by) % by;

const filmIn = (x: number, y: number, count: number) =>
  wrapMod(Math.floor(y) * WALL_COLUMNS + Math.floor(x), count);

export function filmAt(wall: Vec2, count: number): number {
  if (count <= 0) return -1;
  const fx = wall[0] - Math.floor(wall[0]) - 0.5;
  const fy = wall[1] - Math.floor(wall[1]) - 0.5;
  const [px, py] = pitches(1);
  const halfW = ((1 - WALL_GAP) * WALL_RATIO) / 2;
  const halfH = (1 - WALL_GAP) / 2;
  return Math.abs(fx * px) <= halfW && Math.abs(fy * py) <= halfH
    ? filmIn(wall[0], wall[1], count)
    : -1;
}

export function nearestCopy(index: number, around: Vec2, count: number): Vec2 {
  const row0 = Math.floor(around[1]);
  let best: Vec2 = [around[0], around[1]];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let row = row0 - 6; row <= row0 + 6; row += 1) {
    const first = wrapMod(index - row * WALL_COLUMNS, count);
    const col = first + count * Math.round((around[0] - 0.5 - first) / count);
    const at: Vec2 = [col + 0.5, row + 0.5];
    const dx = (at[0] - around[0]) * WALL_RATIO;
    const dy = at[1] - around[1];
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = at;
    }
  }
  return best;
}

export function pixelsOf(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

export const approach = (from: number, to: number, time: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / Math.max(1e-4, time / 4));

export const posterOf = (film: Laureate) =>
  tmdbImageUrl("poster", film.posterPath, "w780")!;

export function loglineOf(overview: string | null | undefined): string | null {
  const flat = overview?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const sentences = flat.match(/.+?[.!?](?=\s+["“‘']?[A-Z]|$)|.+$/g) ?? [flat];
  let line = "";
  for (const sentence of sentences) {
    const next = `${line} ${sentence.trim()}`.trim();
    if (line && next.length > SPOTLIGHT_LOGLINE_LENGTH) break;
    line = next;
    if (line.length >= 90) break;
  }
  if (line.length <= SPOTLIGHT_LOGLINE_LENGTH) return line;
  return `${line.slice(0, SPOTLIGHT_LOGLINE_LENGTH).replace(/\s+\S*$/, "")}…`;
}

export function filmographyOf(
  crew: readonly PersonCrewCredit[],
): DirectorFilm[] {
  const today = new Date().toISOString().slice(0, 10);
  const byTitle = new Map<string, PersonCrewCredit>();
  for (const credit of crew) {
    if (credit.job !== "Director" || !credit.posterPath) continue;
    if (!credit.releaseDate || credit.releaseDate > today) continue;
    if (credit.voteCount < DIRECTOR_KNOWN_VOTES) continue;
    const key = credit.title.toLowerCase();
    const held = byTitle.get(key);
    if (!held || held.voteCount < credit.voteCount) byTitle.set(key, credit);
  }
  return [...byTitle.values()]
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, MAX_FILMS)
    .map((credit) => ({
      id: credit.id,
      posterPath: credit.posterPath!,
      title: credit.title,
      year: credit.releaseYear,
    }))
    .sort(
      (a, b) => (a.year ?? 0) - (b.year ?? 0) || a.title.localeCompare(b.title),
    );
}

const normalTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function winnerAmong(
  found: readonly CatalogHit[],
  title: string,
  year: number,
): CatalogHit | null {
  const wanted = normalTitle(title);
  const fits = found.filter(
    (movie) =>
      movie.posterPath !== null &&
      movie.releaseYear !== null &&
      Math.abs(movie.releaseYear - year) <= 1 &&
      [movie.title, movie.originalTitle].some((name) => {
        const have = normalTitle(name ?? "");
        return (
          have === wanted || have.startsWith(wanted) || wanted.startsWith(have)
        );
      }),
  );
  return fits.sort((a, b) => b.voteCount - a.voteCount)[0] ?? null;
}

export const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

export const subjectOf = (director: Director): SwarmSubject => ({
  films: director.films.map(({ posterPath }) => ({ posterPath })),
  id: director.id,
  profilePath: director.profilePath,
});

export const vignetteAt = (u: number, v: number) => {
  const edge = Math.hypot((u - 0.5) / 0.5, (v - 0.4) / 0.62);
  const t = Math.min(1, Math.max(0, (1.1 - edge) / 0.75));
  return t * t * (3 - 2 * t);
};

export function soften(
  field: Float32Array,
  columns: number,
  rows: number,
  radius: number,
): void {
  const line = new Float32Array(Math.max(columns, rows));
  const pass = (count: number, stride: number, start: number) => {
    for (let i = 0; i < count; i += 1) line[i] = field[start + i * stride]!;
    let sum = 0;
    for (let i = -radius; i <= radius; i += 1) {
      sum += line[Math.min(count - 1, Math.max(0, i))]!;
    }
    for (let i = 0; i < count; i += 1) {
      field[start + i * stride] = sum / (radius * 2 + 1);
      sum += line[Math.min(count - 1, i + radius + 1)]!;
      sum -= line[Math.max(0, i - radius)]!;
    }
  };
  for (let round = 0; round < 2; round += 1) {
    for (let y = 0; y < rows; y += 1) pass(columns, 1, y * columns);
    for (let x = 0; x < columns; x += 1) pass(rows, columns, x);
  }
}

export const lightAt = (pixels: Uint8ClampedArray, i: number) =>
  (pixels[i * 4]! * SWARM_LUMA[0] +
    pixels[i * 4 + 1]! * SWARM_LUMA[1] +
    pixels[i * 4 + 2]! * SWARM_LUMA[2]) /
  255;

const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

export const encoded = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

export function oklab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export const random = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
