import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseMovieId } from "@/features/movie/movie";
import { MoviePageContent } from "@/features/movie/view";
import { project, shareMetadata } from "@/lib/project";
import { getMovieDetails } from "@/lib/tmdb/server";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const id = parseMovieId((await params).id);
  const result = id === null ? null : await getMovieDetails(id);
  if (!result?.success) return { title: `Movie · ${project.name}` };

  const movie = result.data;
  const title = movie.releaseYear
    ? `${movie.title} (${movie.releaseYear})`
    : movie.title;
  return shareMetadata({
    description: movie.overview ?? `${movie.title} on ${project.name}`,
    image: tmdbImageUrl("poster", movie.posterPath, "w500"),
    title,
    type: "video.movie",
  });
}

export default async function MoviePage({
  params,
}: MoviePageProps): Promise<JSX.Element> {
  const id = parseMovieId((await params).id);
  if (id === null) notFound();
  return <MoviePageContent id={id} />;
}
