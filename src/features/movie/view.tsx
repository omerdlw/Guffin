import type { JSX } from "react";
import { notFound } from "next/navigation";
import { getAmbientPalette } from "@/infrastructure/tmdb/ambient";
import {
  getMovieAwards,
  getMovieDetails,
  getMovieImages,
} from "@/infrastructure/tmdb/server";
import { movieSwatch } from "./utils";
import { getMoviePopularLists } from "@/features/lists/server";
import { getFilmStats } from "./server/stats";
import type { MovieReviewSort } from "@/features/reviews";
import { MoviePageChrome } from "./components/chrome";
import { MovieView } from "./components/layout";
import { MovieViewProvider } from "./components/view-switcher";

export async function MoviePageContent({
  id,
  reviews = null,
}: {
  id: number;
  reviews?: { reviewer: string | null; sort: MovieReviewSort } | null;
}): Promise<JSX.Element> {
  const details = getMovieDetails(id);
  const [result, pictures, palette, stats] = await Promise.all([
    details,
    getMovieImages(id),
    details.then((outcome) =>
      outcome.success
        ? getAmbientPalette(
            movieSwatch(outcome.data.backdropPath, outcome.data.posterPath),
          )
        : null,
    ),
    getFilmStats(id),
  ]);
  if (!result.success) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(`Movie ${id} is unavailable (${result.error.kind})`);
  }

  const awards = getMovieAwards(id).then((outcome) =>
    outcome.success ? outcome.data : null,
  );

  return (
    <MovieViewProvider>
      <MoviePageChrome movie={result.data} palette={palette} />
      <MovieView
        awards={awards}
        images={pictures.success ? pictures.data : result.data.images}
        movie={result.data}
        page={
          reviews
            ? { kind: "reviews", ...reviews }
            : { kind: "film", popularLists: getMoviePopularLists(id) }
        }
        stats={stats}
      />
    </MovieViewProvider>
  );
}
