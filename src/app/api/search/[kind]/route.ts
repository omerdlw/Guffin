import {
  createSearchHandler,
  searchListHits,
  searchMovieHits,
  searchPersonHits,
  searchReviewHits,
  searchUserHits,
} from "@/features/search/server";

const handlers = {
  lists: createSearchHandler("lists", searchListHits),
  movies: createSearchHandler("movies", searchMovieHits),
  people: createSearchHandler("people", searchPersonHits),
  reviews: createSearchHandler("reviews", searchReviewHits),
  users: createSearchHandler("users", searchUserHits),
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const { kind } = await params;
  if (!Object.hasOwn(handlers, kind))
    return new Response(null, { status: 404 });
  return handlers[kind as keyof typeof handlers](request);
}
