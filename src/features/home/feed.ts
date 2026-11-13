import type { ContinueItem } from "@/features/tv/show";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

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

interface RisingFilm extends HomeFilm {
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

export interface RecentLog {
  author: Member;
  film: HomeFilm;
  id: string;
  rewatch: boolean;
  watchedAt: string;
}

interface SharedFilm extends HomeFilm {
  faces: Member[];
  friends: number;
}

export interface Picks {
  because: string;
  films: HomeFilm[];
}

interface Pulse {
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
  username: string | null;
  picks: Picks | null;
  shared: SharedFilm[];
}

export interface HomeShows {
  continueWatching: ContinueItem[];
  onTheAir: HomeFilm[];
  trending: HomeFilm[];
}

export interface HomeFeed {
  circle: Circle | null;
  feature: Feature | null;
  lists: HomeList[];
  logged: RecentLog[];
  members: HomeMember[];
  popular: PopularFilm[];
  pulse: Pulse;
  rated: RatedFilm[];
  reviews: HomeReview[];
  rising: RisingFilm[];
  shows: HomeShows | null;
  soon: ShowingFilm[];
  theatres: ShowingFilm[];
}

export const CRAFT = [
  {
    icon: "solar:notebook-bold",
    text: "Keep a diary of every film you watch, with the day you saw it.",
    verb: "Log",
  },
  {
    icon: "solar:star-bold",
    text: "Half-star ratings that add up, film by film, to a portrait of your taste.",
    verb: "Rate",
  },
  {
    icon: "solar:pen-bold",
    text: "Write a line or an essay, then read what everyone else made of it.",
    verb: "Review",
  },
  {
    icon: "solar:bookmark-bold",
    text: "Save the films you mean to see, so choosing tonight takes a minute.",
    verb: "Watchlist",
  },
  {
    icon: "solar:list-bold",
    text: "Rank your favourites or gather a season. Lists are made to be shared.",
    verb: "Lists",
  },
  {
    icon: "solar:users-group-rounded-bold",
    text: "Follow friends and critics, and see what they watched last night.",
    verb: "Follow",
  },
] as const;

export const ROW_ITEM_CLASS =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)]";

export const POPULAR_LIMIT = 12;

export const HERO_LIFT = "sm:-mt-64 lg:-mt-96 xl:-mt-112";

export const POSTER_SIZES =
  "(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 30vw";

export const TEXT_LINK_CLASS =
  "underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current";

export const CAPTION_CLASS =
  "flex min-h-5 min-w-0 items-center gap-1.5 type-meta font-medium text-ink-muted tabular-nums";

export const ambientImage = (backdropPath: string | null) =>
  tmdbImageUrl("backdrop", backdropPath, "w300");
