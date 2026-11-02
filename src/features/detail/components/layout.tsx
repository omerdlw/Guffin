import type { JSX, ReactNode } from "react";
import {
  ASIDE_CLASS,
  COLUMNS_CLASS,
  CONTAINER_CLASS,
  HEADER_CLASS,
  PAGE_CLASS,
  pageBodyClass,
  SIDEBAR_CLASS,
  StickyAside,
} from "@/ui";
import { DetailWallStage } from "../motion";
import { DetailFacts, type Fact } from "./facts";

// The frame of a film or person page. Both pages are this one page: the
// picture projected behind the title, the header beside a sticky sidebar of
// the poster, the hand's buttons and the facts, and the column of sections
// under the header. Only that column is the page's own.
export function DetailLayout({
  after,
  backdrop,
  className,
  header,
  intermission,
  main,
  sidebar,
  wall,
}: {
  // What runs the full width under the columns.
  after?: ReactNode;
  // The projected picture, or nothing when the page has none.
  backdrop: ReactNode | null;
  className: string;
  header: ReactNode;
  intermission: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
  wall: ReactNode;
}): JSX.Element {
  return (
    <main
      className={`${className} ui-scene overflow-x-clip ${PAGE_CLASS}`}
      data-cinematic=""
    >
      {intermission}
      <DetailWallStage cue="wall" wall={wall}>
        <div className={CONTAINER_CLASS}>
          {backdrop}

          <div className={pageBodyClass(Boolean(backdrop))}>
            <div className={COLUMNS_CLASS}>
              <header className={HEADER_CLASS}>{header}</header>

              <StickyAside className={ASIDE_CLASS}>{sidebar}</StickyAside>

              {main}
            </div>

            {after}
          </div>
        </div>
      </DetailWallStage>
    </main>
  );
}

// The sidebar: the poster and the hand's buttons over the facts.
export function DetailSidebar({
  children,
  facts,
}: {
  children: ReactNode;
  facts: readonly Fact[];
}): JSX.Element {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
      <DetailFacts facts={facts} />
    </div>
  );
}
