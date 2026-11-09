import {
  createSearchHandler,
  searchListHits,
  searchMovieHits,
  searchPersonHits,
  searchReviewHits,
  searchShowHits,
  searchUserHits,
} from "@/features/search/server";
import { TV_ENABLED } from "@/lib/env";

const handlers = {
  lists: createSearchHandler("lists", searchListHits),
  movies: createSearchHandler("movies", searchMovieHits),
  people: createSearchHandler("people", searchPersonHits),
  reviews: createSearchHandler("reviews", searchReviewHits),
  shows: createSearchHandler("shows", searchShowHits),
  users: createSearchHandler("users", searchUserHits),
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const { kind } = await params;
  if (!Object.hasOwn(handlers, kind) || (kind === "shows" && !TV_ENABLED))
    return new Response(null, { status: 404 });
  return handlers[kind as keyof typeof handlers](request);
}
