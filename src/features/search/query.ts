import { TV_ENABLED } from "@/lib/env";

export type SearchType = (typeof SEARCH_TYPES)[number];

interface MovieSearchHit {
  id: number;
  match: number;
  originalTitle: string | null;
  score: number;
  posterPath: string | null;
  title: string;
  year: number | null;
}

interface PersonSearchHit {
  department: string | null;
  id: number;
  knownFor: string[];
  match: number;
  score: number;
  name: string;
  profilePath: string | null;
}

export interface UserSearchHit {
  avatarUrl: string | null;
  displayName: string;
  followersCount: number;
  id: string;
  isPrivate: boolean;
  match: number;
  score: number;
  username: string;
}

export interface ListSearchHit {
  id: string;
  itemsCount: number;
  likesCount: number;
  match: number;
  score: number;
  owner: { displayName: string; username: string };
  posterPath: string | null;
  slug: string;
  title: string;
}

export interface ReviewSearchHit {
  author: { avatarUrl: string | null; displayName: string; username: string };
  excerpt: string;
  id: string;
  isSpoiler: boolean;
  likesCount: number;
  match: number;
  score: number;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  year: number | null;
}

export interface SearchResponse<Hit> {
  hits: Hit[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export type MovieSearchResponse = SearchResponse<MovieSearchHit>;

export type PersonSearchResponse = SearchResponse<PersonSearchHit>;

export type UserSearchResponse = SearchResponse<UserSearchHit>;

export type ListSearchResponse = SearchResponse<ListSearchHit>;

export type ReviewSearchResponse = SearchResponse<ReviewSearchHit>;

export type SearchScope = "all" | SearchType;

export interface SearchResults {
  lists: ListSearchHit[];
  movies: MovieSearchHit[];
  people: PersonSearchHit[];
  reviews: ReviewSearchHit[];
  shows: MovieSearchHit[];
  users: UserSearchHit[];
}

export type SearchFailureCode =
  "aborted" | "invalid_query" | "rate_limited" | "unavailable";

export interface SearchFailure {
  code: SearchFailureCode;
  message: string;
}

export type SearchSection = {
  [K in SearchType]: { kind: K; hits: SearchResults[K] };
}[SearchType];

const SEARCH_TYPES = [
  "movies",
  "shows",
  "people",
  "users",
  "lists",
  "reviews",
] as const;

export const ACTIVE_SEARCH_TYPES: readonly SearchType[] = TV_ENABLED
  ? SEARCH_TYPES
  : SEARCH_TYPES.filter((kind) => kind !== "shows");

const SEARCH_MIN_QUERY_LENGTH = 2;

export const SEARCH_MAX_QUERY_LENGTH = 100;

export const SEARCH_PER_PAGE: Readonly<Record<SearchType, number>> = {
  lists: 3,
  movies: 8,
  people: 3,
  reviews: 3,
  shows: 8,
  users: 3,
};

export const SEARCH_OVERVIEW: Readonly<Record<SearchType, number>> = {
  lists: 1,
  movies: 4,
  people: 1,
  reviews: 1,
  shows: 4,
  users: 1,
};

export const SEARCH_FALLBACK_MESSAGE =
  "Search is unavailable right now. Please try again in a moment";

export const MATCH_SCORE = Object.freeze({
  exact: 1,
  prefix: 0.85,
  acronym: 0.82,
  partialPrefix: 0.8,
  phrase: 0.6,
  phraseStart: 0.55,
  allWords: 0.4,
  substring: 0.35,
  coverage: 0.1,
  strong: 0.85,
  weak: 0.55,
});

export function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isSearchable(query: string): boolean {
  return (
    query.length >= SEARCH_MIN_QUERY_LENGTH &&
    query.length <= SEARCH_MAX_QUERY_LENGTH
  );
}

export function foldText(value: string): string {
  return value
    .replace(/[ıİ]/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
}

export function folded(text: string): { origin: number[]; value: string } {
  let value = "";
  const origin: number[] = [];
  for (let index = 0; index < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(index) ?? 0);
    for (const piece of foldText(char)) {
      if (piece === " " && (value === "" || value.endsWith(" "))) continue;
      value += piece;
      origin.push(index);
    }
    index += char.length;
  }
  return { origin, value };
}
