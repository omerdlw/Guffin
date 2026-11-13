import type { MediaType } from "@/lib/tmdb/shared";

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
  films: DirectorFilm[];
  id: number;
  name: string;
  place: string | null;
  profilePath: string;
  rank: number;
}

export interface FilmMarks {
  listed: boolean;
  match: boolean;
  seen: boolean;
}

export interface Loop {
  dispose(): void;
  wake(): void;
}

export type LoopFactory = (step: (now: number, dt: number) => boolean) => Loop;

export type Filter = "all" | "seen" | "unseen";

export const SHOW_CANON_SIZE = 100;

export const TUNNEL_SLOT_CLASS =
  "pointer-events-none fixed inset-x-4 top-[clamp(4.5rem,11svh,7rem)] bottom-[calc(var(--dock-h,6rem)+13rem)] sm:inset-x-8";

export const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));
