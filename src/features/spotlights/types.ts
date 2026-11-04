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

export type DirectorsAct =
  "wait" | "print" | "pour" | "rest" | "leave" | "arrive" | "enter";

export interface GridFit {
  columns: number;
  tile: number;
}

export interface FoundryPlate {
  aspect: number;
  centerX: number;
  centerY: number;
  half: number;
}

export interface FoundryEvents {
  opened(): void;
}

export interface SwarmSubject {
  films: readonly { posterPath: string }[];
  id: Director["id"];
  profilePath: Director["profilePath"];
}

export interface Swarm {
  color: Float32Array;
  count: number;
  face: Float32Array;
  faceGrid: [number, number];
  matte: Uint8Array;
  home: Float32Array;
  meta: Float32Array;
  posterGrid: [number, number];
  source: Float32Array;
}

export interface GatherJob {
  done(swarm: Swarm | null): void;
  subject: SwarmSubject;
}

export interface PortraitBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface PortraitEvents {
  formed(index: number): void;
  swapped(index: number): void;
}

export type Vec2 = [number, number];

export interface WallViewport {
  bulge: number;
  focus: Vec2;
  height: number;
  lens: number;
  pan: Vec2;
  pitch: number;
  radius: number;
  width: number;
}

export interface FilmMarks {
  listed: boolean;
  match: boolean;
  seen: boolean;
}

export interface WallEvents {
  hovered(index: number): void;
  opened(): void;
}

export interface WallLook {
  lift: number;
  match: number;
  seen: number;
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

export interface SwarmRequest {
  columns: number;
  job: number;
  subject: SwarmSubject;
}

export interface SwarmReply {
  job: number;
  swarm: Swarm | null;
}

export type Filter = "all" | "seen" | "unseen";

export interface Marks {
  account: string | null;
  listed: ReadonlySet<number>;
  watched: ReadonlySet<number>;
}
