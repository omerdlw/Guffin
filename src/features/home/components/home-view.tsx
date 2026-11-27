import type { JSX } from "react";
import { DockClear } from "@/design/dock/clear";
import { CONTAINER_CLASS, PAGE_CLASS } from "@/design/foundations/layout";
import type { HomeFeed } from "../model";
import { HomeStage } from "../motion";
import { HomeCircle, HomeLogged } from "./circle-sections";
import { HomeLists, HomeMembers } from "./community-sections";
import { HomeCanon, HomePopular, HomeShowing } from "./film-sections";
import { HomeCraft, HomeJoin, HomePitch } from "./guest-sections";
import { HomeReel } from "./reel";
import { HomeReviews } from "./review-sections";

export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  const { circle } = feed;

  return (
    <HomeStage backdrop={feed.features[0]?.backdropPath ?? null}>
      <main
        id="main"
        className={`home-page ui-scene overflow-x-clip ${PAGE_CLASS}`}
        data-cinematic=""
      >
        <DockClear extra="2rem" />
        <h1 className="sr-only">Guffin</h1>
        <div className={CONTAINER_CLASS}>
          <HomeReel
            features={feed.features}
            username={circle?.username ?? null}
          />

          <div className="mt-6 flex w-full flex-col gap-24 sm:mt-8 sm:gap-32">
            {circle ? <HomeCircle circle={circle} /> : null}
            <HomeLogged logs={feed.logged} />
            {circle ? null : (
              <>
                <HomePitch films={feed.popular} members={feed.pulse.members} />
                <HomeCraft />
              </>
            )}
            <HomePopular films={feed.popular} />
            <HomeReviews reviews={feed.reviews} />
            <HomeCanon films={feed.rated} />
            <HomeShowing soon={feed.soon} theatres={feed.theatres} />
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
