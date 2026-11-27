import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoviePageContent, parseMovieId } from "@/features/movie";
import { project, shareMetadata } from "@/shared/site";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";

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
