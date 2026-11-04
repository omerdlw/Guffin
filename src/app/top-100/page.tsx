import type { JSX } from "react";
import type { Metadata } from "next";
import { getCanon } from "@/features/spotlights/server";
import { WallView } from "@/features/spotlights/top-100";
import { shareMetadata } from "@/lib/project";

export const metadata: Metadata = shareMetadata({
  description: "The IMDb Top 100, hung on one wall in the dark.",
  image: null,
  title: "IMDb Top 100",
});

export default async function CanonPage(): Promise<JSX.Element> {
  const films = await getCanon();
  if (films.length === 0) throw new Error("The IMDb Top 100 is unavailable");
  return <WallView films={films} />;
}
