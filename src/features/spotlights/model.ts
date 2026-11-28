export interface CanonFilm {
  backdropPath: string | null;
  genres: string[];
  id: number;
  posterPath: string;
  rank: number;
  rating: number | null;
  title: string;
  votes: number;
  year: number | null;
}

export interface Loop {
  dispose(): void;
  wake(): void;
}

export type LoopFactory = (step: (now: number, dt: number) => boolean) => Loop;

export const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));
