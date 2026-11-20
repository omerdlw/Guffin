import {
  createSearchBatchHandler,
  searchListHits,
  searchMovieHits,
  searchPersonHits,
  searchReviewHits,
  searchUserHits,
} from "@/features/search/server";

export const GET = createSearchBatchHandler({
  lists: searchListHits,
  movies: searchMovieHits,
  people: searchPersonHits,
  reviews: searchReviewHits,
  users: searchUserHits,
});
