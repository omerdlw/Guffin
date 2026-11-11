import type { JSX } from "react";
import { CONTAINER_CLASS, PAGE_CLASS } from "@/design/foundations/layout";
import { HomeShowing } from "./cinema";
import { HomeCircle } from "./circle";
import { HomeCraft } from "./craft";
import { HomeCanon, HomePopular, HomeShows } from "./films";
import { HomeJoin } from "./join";
import { HomeLists } from "./lists";
import { HomeLogged } from "./logged";
import { HomeMembers } from "./members";
import { HomeStage } from "./motion";
import { HomeOpening } from "./opening";
import { HomeReviews } from "./reviews";
import type { HomeFeed } from "./types";

export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  const { circle } = feed;

  return (
    <HomeStage backdrop={feed.feature?.backdropPath ?? null}>
      <main
        id="main"
        className={`home-page ui-scene overflow-x-clip ${PAGE_CLASS}`}
        data-cinematic=""
      >
        <h1 className="sr-only">Guffin</h1>
        <div className={CONTAINER_CLASS}>
          <HomeOpening
            feature={feed.feature}
            name={circle?.name ?? null}
            username={circle?.username ?? null}
          />

          <div className="mt-20 flex w-full flex-col gap-24 sm:mt-28 sm:gap-32">
            <HomeLogged logs={feed.logged} />
            {circle ? (
              <HomeCircle
                circle={circle}
                continueWatching={feed.shows?.continueWatching ?? []}
              />
            ) : (
              <HomeCraft />
            )}
            <HomePopular films={feed.popular} />
            <HomeReviews reviews={feed.reviews} />
            <HomeCanon films={feed.rated} />
            <HomeShowing soon={feed.soon} theatres={feed.theatres} />
            {feed.shows ? <HomeShows films={feed.shows.trending} /> : null}
            <HomeLists lists={feed.lists} />
            <HomeMembers
              members={feed.members}
              title={
                circle && circle.following > 0
                  ? "People you may know"
                  : "Reviewers to follow"
              }
            />
            <HomeJoin members={feed.pulse.members} />
          </div>
        </div>
      </main>
    </HomeStage>
  );
}
