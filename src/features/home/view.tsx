import type { JSX } from "react";
import { GRAMMAR, Stage, landed, size } from "@/motion/stage";
import { CONTAINER_CLASS, PAGE_CLASS } from "@/ui";
import type { HomeFeed } from "./types";
import { HomeHero } from "./components/hero";
import { HomeJoin } from "./components/join";
import { HomeLists } from "./components/lists";
import { HomeMembers } from "./components/members";
import { HomePulse } from "./components/pulse";
import { HomeReviews } from "./components/reviews";
import { HomeRising } from "./components/rising";
import {
  FilmRow,
  FriendsRow,
  PopularRow,
  RatedRow,
  SharedRow,
} from "./components/rows";
import { HomeShowing } from "./components/showing";

const OPENING_END = GRAMMAR.title.at + GRAMMAR.title.run + landed(1);
const OPENING = {
  end: OPENING_END,
  length: OPENING_END - GRAMMAR.opening.base + size(1),
};

export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  const { circle } = feed;
  const firstName = circle?.name.split(/\s+/)[0] ?? null;

  return (
    <Stage
      className={`home-page ${PAGE_CLASS}`}
      opening={OPENING}
      picture={feed.features.length > 0}
      wash={false}
    >
      <h1 className="sr-only">Guffin</h1>
      <div className={CONTAINER_CLASS}>
        <HomeHero features={feed.features} />

        <div className="mt-16 flex w-full flex-col gap-16 sm:mt-20 sm:gap-20">
          <HomePulse
            greeting={firstName ? `Welcome back, ${firstName}` : null}
            pulse={feed.pulse}
          />
          {circle ? <FriendsRow logs={circle.friends} /> : null}
          <PopularRow films={feed.popular} />
          {circle ? <SharedRow films={circle.shared} /> : null}
          {circle?.picks ? (
            <FilmRow
              films={circle.picks.films}
              icon="solar:magic-stick-3-bold"
              title={`Because you liked ${circle.picks.because}`}
            />
          ) : null}
          <HomeReviews reviews={feed.reviews} />
          <HomeShowing soon={feed.soon} theatres={feed.theatres} />
          <HomeRising films={feed.rising} />
          <RatedRow films={feed.rated} />
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
    </Stage>
  );
}
