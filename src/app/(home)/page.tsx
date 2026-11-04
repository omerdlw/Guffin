import type { JSX } from "react";
import type { Metadata } from "next";
import { getHomeFeed } from "@/features/home/server";
import { HomeView } from "@/features/home/view";
import { project } from "@/lib/project";

export const metadata: Metadata = {
  description: project.description,
  title: { absolute: project.name },
};

export default async function HomePage(): Promise<JSX.Element> {
  return <HomeView feed={await getHomeFeed()} />;
}
