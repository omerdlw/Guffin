import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeasonPageContent } from "@/features/tv/season-view";
import { parseSeasonNumber, parseShowId } from "@/features/tv/show";
import { TV_ENABLED } from "@/lib/env";
import { project, shareMetadata } from "@/lib/project";
import { getShowDetails } from "@/lib/tmdb/server";
import { tmdbImageUrl } from "@/lib/tmdb/shared";

interface Props {
  params: Promise<{ id: string; number: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const raw = await params;
  const id = TV_ENABLED ? parseShowId(raw.id) : null;
  const season = parseSeasonNumber(raw.number);
  const result =
    id === null || season === null ? null : await getShowDetails(id);
  if (!result?.success || season === null)
    return { title: `Season · ${project.name}` };

  const show = result.data;
  const summary = show.seasons.find((s) => s.seasonNumber === season);
  const name = summary?.name ?? `Season ${season}`;
  return shareMetadata({
    description:
      summary?.overview || `${name} of ${show.title} on ${project.name}`,
    image: tmdbImageUrl(
      "poster",
      summary?.posterPath ?? show.posterPath,
      "w500",
    ),
    title: `${show.title} · ${name}`,
    type: "video.tv_show",
  });
}

export default async function SeasonPage({
  params,
}: Props): Promise<JSX.Element> {
  if (!TV_ENABLED) notFound();
  const raw = await params;
  const id = parseShowId(raw.id);
  const season = parseSeasonNumber(raw.number);
  if (id === null || season === null) notFound();
  return <SeasonPageContent id={id} season={season} />;
}
