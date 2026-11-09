import type { JSX } from "react";
import type { Metadata } from "next";
import { getCanon, getShowCanon } from "@/features/spotlights/server";
import { WallView } from "@/features/spotlights/top-100";
import { TV_ENABLED } from "@/lib/env";
import { readParam, type SearchParams } from "@/lib/http";
import { shareMetadata } from "@/lib/project";

interface CanonPageProps {
  searchParams: Promise<SearchParams>;
}

const WALLS = {
  movie: {
    description: "The IMDb Top 100, hung on one wall in the dark.",
    title: "IMDb Top 100",
  },
  tv: {
    description: "The hundred best-rated shows, hung on one wall in the dark.",
    title: "Top 100 Shows",
  },
} as const;

async function wallOf(searchParams: Promise<SearchParams>) {
  return TV_ENABLED && readParam(await searchParams, "type") === "tv"
    ? "tv"
    : "movie";
}

export async function generateMetadata({
  searchParams,
}: CanonPageProps): Promise<Metadata> {
  const wall = WALLS[await wallOf(searchParams)];
  return shareMetadata({ ...wall, image: null });
}

export default async function CanonPage({
  searchParams,
}: CanonPageProps): Promise<JSX.Element> {
  const type = await wallOf(searchParams);
  const films = type === "tv" ? await getShowCanon() : await getCanon();
  if (films.length === 0)
    throw new Error(`The ${WALLS[type].title} is unavailable`);
  return <WallView films={films} title={WALLS[type].title} />;
}
