import type { JSX } from "react";
import type { Metadata } from "next";
import { getLaureates, OscarsView } from "@/features/spotlights";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { getAmbientPalette } from "@/infrastructure/tmdb/server";
import { shareMetadata } from "@/shared/site";

export const metadata: Metadata = shareMetadata({
  description:
    "Every Best Picture winner of the Academy Awards, cast in gold, from Wings to today.",
  image: null,
  title: "Best Picture",
});

export default async function OscarsPage({
  searchParams,
}: {
  searchParams: Promise<{ ceremony?: string }>;
}): Promise<JSX.Element> {
  const [laureates, { ceremony }] = await Promise.all([
    getLaureates(),
    searchParams,
  ]);
  if (laureates.length === 0) throw new Error("Best Picture is unavailable");
  const asked = laureates.findIndex(
    (film) => String(film.ceremony) === ceremony,
  );
  const initial = asked === -1 ? laureates.length - 1 : asked;
  const palette = await getAmbientPalette(
    tmdbImageUrl("backdrop", laureates[initial]!.backdropPath, "w300"),
  );
  return (
    <OscarsView initial={initial} laureates={laureates} palette={palette} />
  );
}
