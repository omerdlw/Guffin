export interface PersonEntry {
  id: number;
  key: string;
  name: string;
  profilePath: string | null;
  subtitle: string;
}

export interface FilmStats {
  liked: number;
  listed: number;
  ratings: number[];
  reviews: number;
  watched: number;
  watchlist: number;
}
