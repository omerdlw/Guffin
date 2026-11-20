import type { JSX } from "react";
import {
  CollectionSkeleton,
  DetailFrameSkeleton,
  DigestSkeleton,
  PeopleSkeleton,
  PopularListsSkeleton,
  PosterSkeleton,
  PostersSkeleton,
  RuleStatsSkeleton,
  SidebarSkeleton,
  StillsSkeleton,
  SynopsisSkeleton,
  TitleSkeleton,
} from "@/features/detail/skeleton";

const MOVIE_FACTS = [
  ["Director", "7.5rem"],
  ["Genres", "9.5rem"],
  ["Writers", "9.75rem"],
  ["Released", "8.5rem"],
  ["Rated", "1rem"],
  ["Language", "3.75rem"],
  ["Budget", "2rem"],
  ["Revenue", "3.75rem"],
] as const;

export function MovieSkeleton(): JSX.Element {
  return (
    <DetailFrameSkeleton
      after={
        <>
          <DigestSkeleton />
          <PopularListsSkeleton />
        </>
      }
      className="movie-page"
      header={
        <>
          <TitleSkeleton />
          <RuleStatsSkeleton />
          <SynopsisSkeleton />
        </>
      }
      main={
        <>
          <PeopleSkeleton />
          <StillsSkeleton
            labels={["Backdrops 64", "Posters 120"]}
            title="Gallery"
            wall
          />
          <StillsSkeleton
            labels={["Clips", "Featurettes", "Trailers"]}
            title="Videos"
          />
          <PostersSkeleton title="More like this" />
        </>
      }
      sidebar={
        <SidebarSkeleton facts={MOVIE_FACTS}>
          <PosterSkeleton />
          <CollectionSkeleton secondary={["List", "Diary", "Awards"]} />
        </SidebarSkeleton>
      }
    />
  );
}
