import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseMovieId } from "@/features/movie/movie";
import { MoviePageContent } from "@/features/movie/view";
import { isMovieReviewSort } from "@/features/reviews/review";
import { readParam, type SearchParams } from "@/lib/http";
import { project, shareMetadata } from "@/lib/project";
import { getMovieDetails } from "@/lib/tmdb/server";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseMovieId((await params).id);
  const result = id === null ? null : await getMovieDetails(id);
  if (!result?.success) return { title: `Reviews · ${project.name}` };

  const movie = result.data;
  const title = movie.releaseYear
    ? `${movie.title} (${movie.releaseYear})`
    : movie.title;
  return shareMetadata({
    description: `What members of ${project.name} wrote about ${movie.title}`,
    image: tmdbImageUrl("poster", movie.posterPath, "w500"),
    title: `Reviews of ${title}`,
    type: "video.movie",
  });
}

export default async function MovieReviewsPage({
  params,
  searchParams,
}: Props): Promise<JSX.Element> {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = parseMovieId(rawId);
  if (id === null) notFound();
  const sort = readParam(query, "sort");
  return (
    <MoviePageContent
      id={id}
      reviews={{
        reviewer: readParam(query, "user") || null,
        sort: isMovieReviewSort(sort) ? sort : "newest",
      }}
    />
  );
}
