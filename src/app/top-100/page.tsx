import type { JSX } from "react";
import type { Metadata } from "next";
import { getCanon, TunnelView } from "@/features/spotlights";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { getAmbientPalette } from "@/infrastructure/tmdb/server";
import { readParam, type SearchParams } from "@/shared/http";
import { shareMetadata } from "@/shared/site";

interface CanonPageProps {
  searchParams: Promise<SearchParams>;
}

const WALL = {
  description:
    "The IMDb Top 100 as a countdown, flown through a projector beam.",
  title: "IMDb Top 100",
} as const;

async function rankOf(searchParams: Promise<SearchParams>) {
  const rank = Number(readParam(await searchParams, "rank"));
  return Number.isInteger(rank) && rank > 0 ? rank : null;
}

export function generateMetadata(): Metadata {
  return shareMetadata({ ...WALL, image: null });
}

export default async function CanonPage({
  searchParams,
}: CanonPageProps): Promise<JSX.Element> {
  const films = await getCanon();
  if (films.length === 0) throw new Error(`The ${WALL.title} is unavailable`);
  const startRank = await rankOf(searchParams);
  const start = films.find((film) => film.rank === startRank) ?? films.at(-1)!;
  const palette = await getAmbientPalette(
    tmdbImageUrl("backdrop", start.backdropPath, "w300"),
  );
  return (
    <TunnelView
      films={films}
      palette={palette}
      startRank={startRank}
      title={WALL.title}
    />
  );
}
