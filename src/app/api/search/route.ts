import {
  createSearchBatchHandler,
  searchListHits,
  searchMovieHits,
  searchPersonHits,
  searchReviewHits,
  searchShowHits,
  searchUserHits,
} from "@/features/search/server";
import { TV_ENABLED } from "@/lib/env";

export const GET = createSearchBatchHandler({
  lists: searchListHits,
  movies: searchMovieHits,
  people: searchPersonHits,
  reviews: searchReviewHits,
  ...(TV_ENABLED ? { shows: searchShowHits } : {}),
  users: searchUserHits,
});
