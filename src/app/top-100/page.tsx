import type { JSX } from "react";
import type { Metadata } from "next";
import { getCanon, getShowCanon } from "@/features/spotlights/server";
import { TunnelView } from "@/features/spotlights/top-100";
import { TV_ENABLED } from "@/lib/env";
import { readParam, type SearchParams } from "@/lib/http";
import { shareMetadata } from "@/lib/project";

interface CanonPageProps {
  searchParams: Promise<SearchParams>;
}

const WALLS = {
  movie: {
    description:
      "The IMDb Top 100 as a countdown, flown through a projector beam.",
    title: "IMDb Top 100",
  },
  tv: {
    description:
      "The hundred best-rated shows as a countdown, flown through a projector beam.",
    title: "Top 100 Shows",
  },
} as const;

async function wallOf(searchParams: Promise<SearchParams>) {
  return TV_ENABLED && readParam(await searchParams, "type") === "tv"
    ? "tv"
    : "movie";
}

async function rankOf(searchParams: Promise<SearchParams>) {
  const rank = Number(readParam(await searchParams, "rank"));
  return Number.isInteger(rank) && rank > 0 ? rank : null;
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
  return (
    <TunnelView
      films={films}
      startRank={await rankOf(searchParams)}
      title={WALLS[type].title}
    />
  );
}
