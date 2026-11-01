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

export const MAX_FILMS = 64;

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
