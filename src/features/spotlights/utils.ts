import { toLogline } from "@/lib/format";
import { type PersonCrewCredit, tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  DIRECTOR_KNOWN_VOTES,
  DIRECTORS_CORE_TALL,
  DIRECTORS_FACE_MIN,
  DIRECTORS_FACE_STEP,
  DIRECTORS_GAP,
  DIRECTORS_GROW,
  DIRECTORS_MAX_CORE,
  DIRECTORS_MIN_CELL,
  DIRECTORS_MIN_SLOTS,
  DIRECTORS_SHOWN,
  DIRECTORS_SHRINK,
  DIRECTORS_POSTER_RATIO,
  FIRST_CEREMONY_YEAR,
  GENRE_LABELS,
  MAX_FILMS,
  SPOTLIGHT_GENRE_LIMIT,
  SPOTLIGHT_LOGLINE_ENOUGH,
  SPOTLIGHT_LOGLINE_LENGTH,
} from "./constants";
import type {
  CatalogHit,
  Director,
  DirectorFilm,
  DirectorsLayout,
  DirectorsPlace,
  Laureate,
} from "./types";

export const genreNames = (ids: readonly number[]) =>
  ids
    .flatMap((id) => (GENRE_LABELS[id] ? [GENRE_LABELS[id]] : []))
    .slice(0, SPOTLIGHT_GENRE_LIMIT);

export const ceremonyYear = (ceremony: number) =>
  FIRST_CEREMONY_YEAR + ceremony - (ceremony >= 3 && ceremony <= 5 ? 2 : 1);

export function ordinal(value: number): string {
  const tail = value % 100;
  if (tail >= 11 && tail <= 13) return `${value}th`;
  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

export const lifeSpanOf = (director: Director) =>
  director.died ? `${director.born}–${director.died}` : `Born ${director.born}`;

/**
 * The portrait is as wide as the dock and stands on the bottom edge; the
 * posters fill what is left above and beside it, so the wall mirrors left
 * to right. Its width fixes the size of the cells over it: `core` cells
 * across make the dock's width, so the portrait keeps its own 2:3 shape. The
 * fewest cells across that still show most of the films wins, because that
 * is the largest poster. There is always a row of films above the portrait.
 * Rows and side columns may grow or shrink a little to take the room, never
 * so much that a poster or the portrait is pulled out of shape. The portrait
 * only gives up the dock's width when the screen is too short to hold it
 * with a row above, or when even the fullest wall would hold a handful of
 * films.
 */
export function fitDirectors(
  width: number,
  height: number,
  count: number,
  dock: number,
): DirectorsLayout {
  const need = Math.ceil(count * DIRECTORS_SHOWN);
  const floor = Math.min(count, DIRECTORS_MIN_SLOTS);
  let best: DirectorsLayout | null = null;
  for (
    let scale = 1;
    scale >= DIRECTORS_FACE_MIN;
    scale -= DIRECTORS_FACE_STEP
  ) {
    const face = dock * scale;
    let fullest: DirectorsLayout | null = null;
    for (let core = 2; core <= DIRECTORS_MAX_CORE; core += 1) {
      const cellWidth = (face - DIRECTORS_GAP * (core - 1)) / core;
      if (cellWidth < DIRECTORS_MIN_CELL) break;
      const natural = cellWidth * DIRECTORS_POSTER_RATIO;
      const rowsMax = Math.floor(
        (height + DIRECTORS_GAP) / (natural * DIRECTORS_SHRINK + DIRECTORS_GAP),
      );
      const across = Math.floor(
        (width + DIRECTORS_GAP) / (cellWidth + DIRECTORS_GAP),
      );
      const sidesMax = Math.max(0, Math.floor((across - core) / 2));
      let found: DirectorsLayout | null = null;
      for (
        let coreRows = core;
        coreRows >= Math.ceil(core * DIRECTORS_CORE_TALL);
        coreRows -= 1
      ) {
        for (let side = 0; side <= sidesMax; side += 1) {
          const columns = core + 2 * side;
          const sideWidth =
            side > 0
              ? Math.min(
                  (width - face) / (2 * side) - DIRECTORS_GAP,
                  cellWidth * DIRECTORS_GROW,
                )
              : cellWidth;
          for (let rows = coreRows + 1; rows <= rowsMax; rows += 1) {
            const slots = (rows - coreRows) * columns + 2 * side * coreRows;
            if (slots > count) break;
            const cellHeight = Math.min(
              (height - DIRECTORS_GAP * (rows - 1)) / rows,
              natural * DIRECTORS_GROW,
            );
            const layout = {
              cellHeight,
              cellWidth,
              columns,
              core,
              coreRows,
              rows,
              sideWidth,
              slots,
            };
            const enough = slots >= need;
            const held = found && found.slots >= need;
            if (
              !found ||
              (enough && !held) ||
              (enough === held && slots > found.slots)
            )
              found = layout;
          }
        }
      }
      if (!found) continue;
      if (found.slots >= need) return found;
      if (!fullest || found.slots > fullest.slots) fullest = found;
    }
    if (fullest && scale === 1 && fullest.slots >= floor) return fullest;
    if (fullest && (!best || fullest.slots > best.slots)) best = fullest;
  }
  if (best) return best;
  const cellHeight = (height - DIRECTORS_GAP) / 2;
  const cellWidth = cellHeight / DIRECTORS_POSTER_RATIO;
  return {
    cellHeight,
    cellWidth,
    columns: 2,
    core: 2,
    coreRows: 2,
    rows: 2,
    sideWidth: cellWidth,
    slots: 0,
  };
}

/**
 * Every cell around the portrait, nearest first. A director's films come in
 * order of fame, so the best known stand right above and beside the portrait
 * and the wall arrives as one ripple that mirrors left to right.
 */
export function placesOf({
  cellHeight,
  cellWidth,
  columns,
  core,
  coreRows,
  rows,
}: DirectorsLayout): DirectorsPlace[] {
  const column0 = (columns - core) / 2;
  const row0 = rows - coreRows;
  const cells: Omit<DirectorsPlace, "rank">[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const inside =
        row >= row0 && column >= column0 && column < column0 + core;
      if (!inside) cells.push({ column: column + 1, row: row + 1 });
    }
  }
  const across = cellWidth + DIRECTORS_GAP;
  const down = cellHeight + DIRECTORS_GAP;
  const reach = (cell: Omit<DirectorsPlace, "rank">) => {
    const x = Math.abs(cell.column - 0.5 - columns / 2) * across;
    const y = (row0 - (cell.row - 0.5)) * down;
    const beside = Math.max(0, x - (core * across) / 2);
    const above = Math.max(0, y);
    return Math.hypot(beside, above) + Math.hypot(x, y) / 1000;
  };
  const order = cells
    .map((cell, i) => ({ i, reach: reach(cell) }))
    .sort((a, b) => a.reach - b.reach || a.i - b.i);
  const ranks = new Map(order.map(({ i }, rank) => [i, rank]));
  return cells.map((cell, i) => ({ ...cell, rank: ranks.get(i)! }));
}

export const wait = (seconds: number) =>
  new Promise<void>((done) => setTimeout(done, seconds * 1000));

export const smooth = (t: number) => t * t * (3 - 2 * t);

export const clamp = (value: number, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));

/**
 * Where a gesture settles. A gesture starts on a film and ends between two;
 * any real movement carries at least one film, so a single wheel notch is
 * never lost.
 */
export function settleTarget(from: number, to: number): number {
  const moved = to - from;
  if (Math.abs(moved) < 0.08) return from;
  return from + Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
}

/**
 * The film a step lands on. A film that does not match the filter is passed
 * over; with nothing to land on the step is a plain one, and the ends hold.
 */
export function stepFrom(
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

/** 3,124,000 votes read "3.1M". */
export const votesOf = (votes: number) =>
  new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(votes);

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

export const spotlightLogline = (overview: string | null | undefined) =>
  toLogline(overview, SPOTLIGHT_LOGLINE_LENGTH, SPOTLIGHT_LOGLINE_ENOUGH);

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
    }));
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
