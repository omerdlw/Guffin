import {
  createSearchBatchHandler,
  searchListHits,
  searchMovieHits,
  searchPersonHits,
  searchReviewHits,
  searchUserHits,
} from "@/features/search/queries";

export const GET = createSearchBatchHandler({
  lists: searchListHits,
  movies: searchMovieHits,
  people: searchPersonHits,
  reviews: searchReviewHits,
  users: searchUserHits,
});
