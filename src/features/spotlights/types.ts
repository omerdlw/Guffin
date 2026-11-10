import type { MediaType } from "@/features/media/types";
import type { MovieSearchPage } from "@/lib/tmdb/shared";

interface SpotlightFilm {
  backdropPath: string | null;
  genres: string[];
  id: number;
  posterPath: string;
  title: string;
  year: number | null;
}

export interface Laureate extends SpotlightFilm {
  ceremony: number;
  ceremonyYear: number;
  director: string | null;
  honoured: number;
  logline: string | null;
  runtime: number | null;
  tagline: string | null;
}

export interface CanonFilm extends SpotlightFilm {
  /** Films unless set; the shows wall carries "tv". */
  mediaType?: MediaType;
  rank: number;
  rating: number | null;
  votes: number;
}

export interface DirectorFilm {
  id: number;
  posterPath: string;
  title: string;
  year: number | null;
}

export interface Director {
  born: number;
  died: number | null;
  /** Most famous first. */
  films: DirectorFilm[];
  id: number;
  name: string;
  place: string | null;
  profilePath: string;
  rank: number;
}

export type LaureateEntry = readonly [title: string, year: number];

export interface DirectorEntry {
  born: number;
  died: number | null;
  name: string;
  person: number;
}

export type CanonEntry = readonly [imdbId: string, title: string, year: number];

export interface DirectorsLayout {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  core: number;
  coreRows: number;
  rows: number;
  sideWidth: number;
  slots: number;
}

export interface DirectorsPlace {
  column: number;
  rank: number;
  row: number;
}

export interface DirectorsSize {
  height: number;
  width: number;
}

export interface FilmMarks {
  listed: boolean;
  match: boolean;
  seen: boolean;
}

export interface TunnelEvents {
  hovered(index: number): void;
  opened(): void;
  selected(index: number): void;
}

export interface TunnelSlot {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface TunnelPrint {
  color: ImageBitmap;
  gray: ImageBitmap;
  tint: readonly [number, number, number];
}

export interface Loop {
  dispose(): void;
  wake(): void;
}

export type LoopFactory = (step: (now: number, dt: number) => boolean) => Loop;

export interface RenderTarget {
  depth: WebGLRenderbuffer | null;
  fbo: WebGLFramebuffer;
  height: number;
  texture: WebGLTexture;
  width: number;
}

export interface BloomLook {
  amount: number;
  grain: number;
  threshold: number;
  vignette: number;
}

export interface Kept<T> {
  at: number;
  value: T;
}

export type CatalogHit = MovieSearchPage["results"][number];

export interface SpotlightDockAction {
  icon: string;
  label: string;
  onClick?: () => void;
}

export type Filter = "all" | "seen" | "unseen";

export interface Marks {
  account: string | null;
  listed: ReadonlySet<number>;
  watched: ReadonlySet<number>;
}
