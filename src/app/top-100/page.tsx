import type { JSX } from "react";
import type { Metadata } from "next";
import { getCanon } from "@/features/spotlights/server";
import { TunnelView } from "@/features/spotlights/top-100/view";
import { readParam, type SearchParams } from "@/lib/http";
import { shareMetadata } from "@/lib/project";

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
  return (
    <TunnelView
      films={films}
      startRank={await rankOf(searchParams)}
      title={WALL.title}
    />
  );
}
