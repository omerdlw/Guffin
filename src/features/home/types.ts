export interface HomeFilm {
  backdropPath: string | null;
  id: number;
  posterPath: string | null;
  title: string;
  year: number | null;
}

export interface Member {
  avatarUrl: string | null;
  displayName: string;
  username: string;
}

export interface Feature extends HomeFilm {
  backdropPath: string;
  genres: string[];
  logline: string | null;
  runtime: number | null;
  social: { faces: Member[]; rating: number | null; watchers: number } | null;
  trending: number | null;
}

export interface PopularFilm extends HomeFilm {
  faces: Member[];
  members: number;
  rating: number | null;
  watchers: number;
}

export interface RisingFilm extends HomeFilm {
  lift: number;
  week: number;
}

export interface RatedFilm extends HomeFilm {
  rating: number;
  ratings: number;
}

export interface ShowingFilm extends HomeFilm {
  releaseDate: string | null;
  waiting: number;
}

export interface HomeReview {
  author: Member;
  content: string;
  createdAt: string;
  film: HomeFilm;
  id: string;
  likes: number;
  rating: number | null;
}

export interface HomeList {
  description: string;
  id: string;
  films: number;
  likes: number;
  owner: Member;
  previews: (string | null)[];
  slug: string;
  title: string;
}

export interface HomeMember extends Member {
  bio: string | null;
  followers: number;
  id: string;
  reason: string;
  reviews: number;
  watched: number;
}

export interface FriendLog {
  author: Member;
  film: HomeFilm;
  id: string;
  liked: boolean;
  rating: number | null;
  reviewed: boolean;
  rewatch: boolean;
  watchedAt: string;
}

export interface SharedFilm extends HomeFilm {
  faces: Member[];
  friends: number;
}

export interface Picks {
  because: string;
  films: HomeFilm[];
}

export interface Pulse {
  films: number;
  lists: number;
  logs: number;
  members: number;
  reviews: number;
}

export interface Circle {
  following: number;
  friends: FriendLog[];
  name: string;
  picks: Picks | null;
  shared: SharedFilm[];
}

export interface HomeFeed {
  circle: Circle | null;
  features: Feature[];
  lists: HomeList[];
  members: HomeMember[];
  popular: PopularFilm[];
  pulse: Pulse;
  rated: RatedFilm[];
  reviews: HomeReview[];
  rising: RisingFilm[];
  soon: ShowingFilm[];
  theatres: ShowingFilm[];
}
