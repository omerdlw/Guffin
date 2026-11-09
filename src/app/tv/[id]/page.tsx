import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ShowPageContent } from "@/features/tv/view";
import { parseShowId } from "@/features/tv/utils";
import { TV_ENABLED } from "@/lib/env";
import { readParam, type SearchParams } from "@/lib/http";
import { project, reviewHref, shareMetadata } from "@/lib/project";
import { getShowDetails } from "@/lib/tmdb/server";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

interface ShowPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
}: ShowPageProps): Promise<Metadata> {
  const id = TV_ENABLED ? parseShowId((await params).id) : null;
  const result = id === null ? null : await getShowDetails(id);
  if (!result?.success) return { title: `Show · ${project.name}` };

  const show = result.data;
  const title = show.releaseYear
    ? `${show.title} (${show.releaseYear})`
    : show.title;
  return shareMetadata({
    description: show.overview ?? `${show.title} on ${project.name}`,
    image: tmdbImageUrl("poster", show.posterPath, "w500"),
    title,
    type: "video.tv_show",
  });
}

export default async function ShowPage({
  params,
  searchParams,
}: ShowPageProps): Promise<JSX.Element> {
  if (!TV_ENABLED) notFound();
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = parseShowId(rawId);
  if (id === null) notFound();
  const reviewer = readParam(query, "review");
  if (reviewer) permanentRedirect(reviewHref(id, reviewer, "tv"));
  return <ShowPageContent id={id} />;
}
