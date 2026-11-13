import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isMovieReviewSort } from "@/features/reviews/review";
import { parseShowId } from "@/features/tv/show";
import { ShowPageContent } from "@/features/tv/view";
import { TV_ENABLED } from "@/lib/env";
import { readParam, type SearchParams } from "@/lib/http";
import { project, shareMetadata } from "@/lib/project";
import { getShowDetails } from "@/lib/tmdb/server";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = TV_ENABLED ? parseShowId((await params).id) : null;
  const result = id === null ? null : await getShowDetails(id);
  if (!result?.success) return { title: `Reviews · ${project.name}` };

  const show = result.data;
  const title = show.releaseYear
    ? `${show.title} (${show.releaseYear})`
    : show.title;
  return shareMetadata({
    description: `What members of ${project.name} wrote about ${show.title}`,
    image: tmdbImageUrl("poster", show.posterPath, "w500"),
    title: `Reviews of ${title}`,
    type: "video.tv_show",
  });
}

export default async function ShowReviewsPage({
  params,
  searchParams,
}: Props): Promise<JSX.Element> {
  if (!TV_ENABLED) notFound();
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = parseShowId(rawId);
  if (id === null) notFound();
  const sort = readParam(query, "sort");
  return (
    <ShowPageContent
      id={id}
      reviews={{
        kind: "reviews",
        reviewer: readParam(query, "user") || null,
        sort: isMovieReviewSort(sort) ? sort : "newest",
      }}
    />
  );
}
