import type { JSX } from "react";
import type { Metadata } from "next";
import { getHomeFeed, HomeView } from "@/features/home";
import { project } from "@/shared/site";

export const metadata: Metadata = {
  description: project.description,
  title: { absolute: project.name },
};

export default async function HomePage(): Promise<JSX.Element> {
  return <HomeView feed={await getHomeFeed()} />;
}
