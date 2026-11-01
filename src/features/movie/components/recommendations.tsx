import type { JSX } from "react";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { getRecommendations } from "../utils";
import { MoviePosterLink } from "./poster-link";
import { Carousel, Header, Section } from "@/motion/stage";
import { CAROUSEL_ITEM, RADIUS, TONE } from "@/ui";

export function MovieRecommendations({
  movie,
}: {
  movie: MovieDetails;
}): JSX.Element | null {
  const recommendations = getRecommendations(movie);
  if (recommendations.length === 0) return null;

  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:stars-minimalistic-bold" title="More like this" />
      <Carousel
        arrowClassName={TONE.arrows}
        className="rounded-card"
        itemClassName={CAROUSEL_ITEM}
        label="More like this"
        radius={RADIUS.card}
      >
        {recommendations.map((item) => (
          <MoviePosterLink
            key={item.id}
            carried
            movie={{
              id: item.id,
              posterPath: item.posterPath,
              title: item.title,
              year: item.releaseYear,
            }}
            radius={RADIUS.card}
            sizes="(min-width: 768px) 22vw, 30vw"
          />
        ))}
      </Carousel>
    </Section>
  );
}
