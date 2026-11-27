import type { JSX } from "react";
import type { Metadata } from "next";
import { getHomeFeed, HomeView } from "@/features/home";
import { ambientImage } from "@/features/home/model";
import { getAmbientPalette } from "@/infrastructure/tmdb/server";
import { project } from "@/shared/site";

export const metadata: Metadata = {
  description: project.description,
  title: { absolute: project.name },
};

export default async function HomePage(): Promise<JSX.Element> {
  const feed = await getHomeFeed();
  const palette = await getAmbientPalette(
    ambientImage(feed.features[0]?.backdropPath ?? null),
  );
  return <HomeView feed={feed} palette={palette} />;
}
