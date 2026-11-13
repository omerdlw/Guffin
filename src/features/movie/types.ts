import type { MediaType } from "@/features/catalog/types";
import type { ModalContainerProps } from "@omerdlw/base-framework/modal";
import type { ReactNode } from "react";
import type { MutationResult } from "@/features/auth/types";
import type { PopularList } from "@/features/lists/types";
import type {
  MovieReview,
  MovieReviewFilter,
  MovieReviewSort,
} from "@/features/reviews/types";
import type { Awards, MovieDetails } from "@/lib/tmdb/shared";

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

export interface MovieCrewEntry {
  creditId: string;
  department: string | null;
  id: number;
  jobs: string;
  name: string;
  profilePath: string | null;
}

export interface ProviderEntry {
  id: number;
  logoPath: string | null;
  name: string;
}

export interface RegionProviders {
  buy: ProviderEntry[];
  free: ProviderEntry[];
  link: string | null;
  rent: ProviderEntry[];
  stream: ProviderEntry[];
}

export type WatchProvidersResult = MutationResult<{
  regions: Record<string, RegionProviders>;
}>;

export type Provider = {
  displayPriority: number;
  logoPath: string | null;
  name: string;
  providerId: number;
};

export interface CastModalProps<T> {
  close: (result?: unknown) => void;
  data: T;
  header: ModalContainerProps["header"];
}

export type PeopleModalData = {
  cast: PersonEntry[];
  crew: PersonEntry[];
  initialTab: "cast" | "crew";
};

export type VideoModalData = {
  key: string;
  name: string;
};

export type PeopleTab = "cast" | "crew";

export interface MoviePeopleProps {
  cast: PersonEntry[];
  crew: PersonEntry[];
  now?: boolean;
}

export type GalleryTab = "backdrops" | "posters";

export interface ReelState {
  project: (path: string | null) => void;
  reel: string | null;
}

export type MovieViewKey = "overview" | "awards";

export interface MovieViewState {
  show: (view: MovieViewKey) => void;
  toggle: (view: MovieViewKey) => void;
  view: MovieViewKey;
}

export type MovieArtwork = Pick<
  MovieDetails,
  "backdropPath" | "id" | "posterPath" | "title"
>;

export interface ReviewDigest {
  popular: MovieReview[];
  recent: MovieReview[];
  viewerId: string | null;
}

export interface ReviewsQuery {
  filter: MovieReviewFilter;
  sort: MovieReviewSort;
  username: string | null;
}

export interface ReviewsPage {
  key: string;
  reviews: MovieReview[];
  stats: { average: number | null; rated: number; total: number };
  total: number;
  viewerId: string | null;
}

export interface MoviePosterLinkProps {
  mediaType?: MediaType;
  movie: {
    id: number;
    posterPath: string | null;
    title: string;
    year: number | null;
  };
  caption?: ReactNode;
  detail?: string | null;
  onNavigated?: () => void;
  overlay?: ReactNode;
  radius?: number;
  sizes?: string;
}

export type AwardsRequest = Promise<Awards | null>;

export type MoviePageKind =
  | { kind: "film"; popularLists: Promise<PopularList[]> }
  | { kind: "reviews"; reviewer: string | null; sort: MovieReviewSort };

export type WatchProvidersSource =
  | { status: "loading" }
  | { error: string; status: "error" }
  | { regions: Record<string, RegionProviders>; status: "ready" };

export interface WatchProvidersData {
  mediaType?: MediaType;
  movieId: number;
  title: string;
}

export type ProviderCategory = "stream" | "rent" | "buy" | "free";
