import type { Result } from "@omerdlw/base-framework/result";
import type { SEARCH_TYPES } from "./constants";

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

export interface SearchResponseMap {
  lists: ListSearchResponse;
  movies: MovieSearchResponse;
  people: PersonSearchResponse;
  reviews: ReviewSearchResponse;
  users: UserSearchResponse;
}

export type SearchScope = "all" | SearchType;

export interface SearchResults {
  lists: ListSearchHit[];
  movies: MovieSearchHit[];
  people: PersonSearchHit[];
  reviews: ReviewSearchHit[];
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

export interface SearchView {
  page: number;
  pages: number;
  perPage: number;
  sections: SearchSection[];
  total: number;
}

export type SearchHits = SearchResults[SearchType];

export type SearchAnswers = ReadonlyMap<string, SearchHits>;

export interface SearchState {
  clear: () => void;
  failure: SearchFailure | null;
  input: string;
  isLoading: boolean;
  query: string;
  results: SearchResults | null;
  retry: () => void;
  setInput: (value: string) => void;
}

export interface PersonResultRowProps {
  person: {
    department: string | null;
    id: number;
    knownFor?: readonly string[];
    name: string;
    profilePath: string | null;
  };
  onNavigated?: () => void;
  query?: string;
}

export interface FilmCandidate {
  id: number;
  originalTitle: string | null;
  popularity: number;
  posterPath: string | null;
  releaseYear: number | null;
  title: string;
  voteCount: number;
}

export interface SearchOptions {
  page?: number;
  signal?: AbortSignal;
}

export type SearchRunner = (
  query: string,
  options: Required<SearchOptions>,
) => Promise<Result<SearchResponse<unknown>, SearchFailure>>;
