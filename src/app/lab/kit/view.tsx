"use client";

import { useState, type JSX } from "react";
import { HEADLINE_TYPE, TONE, surfaceButton } from "@/ui";
import { cn } from "@/ui/cn";
import {
  Room,
  bindScore,
  defineScore,
  useShowing,
  useWall,
} from "@/motion/engine";

const score = defineScore({
  cast: {
    title: "ink",
    fact: "light",
    stat: "light",
    header: { matter: "ink", enter: "still" },
    card: { matter: "paper", leave: "sink" },
    still: { matter: "plate", enter: "door" },
    tile: "paper",
  },
  opening: ["title", ["fact", "stat"]],
  sections: {
    shelf: ["header"],
    gallery: ["header", "still"],
    view: ["card"],
    wall: ["header", "tile"],
  },
});

const {
  StageRoot,
  Part,
  Section,
  Text,
  Header,
  Expose,
  Count,
  Swap,
  Deck,
  WallStage,
} = bindScore(score);

const PEOPLE = {
  all: [
    "Marlon Brando",
    "Al Pacino",
    "James Caan",
    "Robert Duvall",
    "Diane Keaton",
    "Talia Shire",
  ],
  men: ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall"],
  women: ["Diane Keaton", "Talia Shire"],
};

const STILLS = ["#6b4a2b", "#3a2a1c", "#8a6440", "#2b1d12"];

const NAME = cn(TONE.label, "text-ink-body");

function Dot() {
  return <span className="block size-3 rounded-full bg-current" />;
}

function Cards({ names }: { names: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {names.map((name, index) => (
        <Part
          name="card"
          index={index}
          key={name}
          touch="lift"
          className="rounded-card bg-fill px-4 py-6 text-ink-body"
        >
          {name}
        </Part>
      ))}
    </div>
  );
}

function Shelf() {
  const [filter, setFilter] = useState<keyof typeof PEOPLE>("all");
  return (
    <Section cue="shelf" className="mt-24">
      <Header
        part="header"
        title="Cast"
        icon={<Dot />}
        nameClassName={NAME}
        actions={
          <div className="flex gap-1">
            {(Object.keys(PEOPLE) as (keyof typeof PEOPLE)[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={key === filter}
                className={cn(surfaceButton(key === filter), "px-4")}
                onClick={() => setFilter(key)}
              >
                {key}
              </button>
            ))}
          </div>
        }
      />
      <Swap id={filter} cue="view">
        <Cards names={PEOPLE[filter]} />
      </Swap>
    </Section>
  );
}

function Gallery() {
  const wall = useWall();
  return (
    <Section cue="gallery" className="mt-24">
      <Header
        part="header"
        title="Stills"
        icon={<Dot />}
        nameClassName={NAME}
        actions={
          <button
            type="button"
            className={cn(surfaceButton(false), "px-4")}
            onClick={(event) => wall?.open(event.currentTarget)}
          >
            See all
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STILLS.map((color, index) => (
          <div
            className="aspect-video overflow-hidden rounded-card"
            key={color}
          >
            <Part
              name="still"
              index={index}
              className="size-full"
              // The picture: a gradient stands in for an image.
            >
              <div
                className="size-full"
                style={{
                  background: `linear-gradient(135deg, ${color}, #000)`,
                }}
              />
            </Part>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Views() {
  const [shown, setShown] = useState<"cast" | "crew">("cast");
  return (
    <div className="mt-24">
      <div className="mb-4 flex gap-1">
        {(["cast", "crew"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === shown}
            className={cn(surfaceButton(key === shown), "px-4")}
            onClick={() => setShown(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <Deck
        cue="view"
        shown={shown}
        views={{
          cast: <Cards names={PEOPLE.all.slice(0, 3)} />,
          crew: (
            <Cards
              names={["Francis Ford Coppola", "Gordon Willis", "Nino Rota"]}
            />
          ),
        }}
      />
    </div>
  );
}

// A deck whose views are columns of their own sections: each section plays
// as it is reached, and plays again on the way back to its view.
function Columns() {
  const [shown, setShown] = useState<"stills" | "more">("stills");
  return (
    <div className="mt-24" data-lab="columns">
      <div className="mb-4 flex gap-1">
        {(["stills", "more"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === shown}
            className={cn(surfaceButton(key === shown), "px-4")}
            onClick={() => setShown(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <Deck
        shown={shown}
        views={{
          stills: (
            <>
              <Gallery />
              <Gallery />
            </>
          ),
          more: <Gallery />,
        }}
      />
    </div>
  );
}

function Wall() {
  const wall = useWall();
  return (
    <Section cue="wall" className="mx-auto max-w-4xl px-4 pt-[20vh] pb-[40vh]">
      <Header
        part="header"
        title="All stills"
        icon={<Dot />}
        nameClassName={NAME}
        actions={
          <button
            type="button"
            className={cn(surfaceButton(false), "px-4")}
            onClick={() => wall?.close()}
          >
            Close
          </button>
        }
      />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, index) => (
          <Part
            name="tile"
            index={index}
            key={index}
            className="aspect-square rounded-card"
          >
            <div
              className="size-full rounded-card"
              style={{
                background: `linear-gradient(135deg, ${STILLS[index % 4]}, #000)`,
              }}
            />
          </Part>
        ))}
      </div>
    </Section>
  );
}

function House() {
  const [on, setOn] = useState(false);
  useShowing(on);
  return (
    <button
      type="button"
      className={cn(surfaceButton(on), "fixed right-4 bottom-4 z-20 px-4")}
      onClick={() => setOn((value) => !value)}
    >
      House {on ? "up" : "down"}
    </button>
  );
}

export function KitLab(): JSX.Element {
  return (
    <StageRoot grade={{ l: 0.74, c: 0.1, h: 40 }}>
      <Room />
      <WallStage cue="wall" wall={<Wall />}>
        <main className="ui-scene relative z-10 mx-auto max-w-4xl px-4 pt-[20vh] pb-[40vh]">
          <Text
            part="title"
            text="The Godfather"
            as="h1"
            mask
            className={HEADLINE_TYPE}
          />
          <div className="mt-6 flex flex-wrap items-baseline gap-6 text-ink-body">
            <Expose part="fact" index={0} text="Crime" hover />
            <Expose part="fact" index={1} text="1972" hover />
            <Expose part="fact" index={2} text="Paramount Pictures" hover />
            <Count
              part="stat"
              value={134966411}
              format={(value) => `$${value.toLocaleString("en-US")}`}
              hover
            />
          </div>
          <Shelf />
          <Gallery />
          <Views />
          <Columns />
        </main>
      </WallStage>
      <House />
    </StageRoot>
  );
}
