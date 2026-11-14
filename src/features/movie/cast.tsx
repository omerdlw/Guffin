"use client";

import { type CSSProperties, Suspense, use, useState } from "react";
import { useModal } from "@omerdlw/base-framework/modal";
import { Button, Image, SegmentedControl } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { RADIUS } from "@/design/foundations/geometry";
import { cn } from "@/design/ui";
import { useArtworkPath } from "@/features/artwork/artwork";
import { Heading } from "@/features/detail/layout";
import {
  DetailExpose,
  DetailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import { mediaHref, personHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import cast from "./cast.module.css";
import {
  type KnownForMap,
  MOVIE_FEATURED_PEOPLE,
  type PeopleTab,
  peopleTabs,
  type PersonEntry,
} from "./movie";
import { PeopleModal, PersonCard } from "./people-modal";

interface MoviePeopleProps {
  cast: PersonEntry[];
  crew: PersonEntry[];
  knownFor?: Promise<KnownForMap>;
  now?: boolean;
}

const MOVIE_COMPACT_PEOPLE = 3;

function compactCells(count: number, hasMore: boolean): CSSProperties {
  const extra = hasMore ? 1 : 0;
  return {
    "--cells": count + extra,
    "--cells-sm": Math.min(count, 2),
  } as CSSProperties;
}

// The fan's leaves beside the portrait, innermost first.
const FAN = [
  { side: "l", at: 1 },
  { side: "r", at: 1 },
  { side: "l", at: 2 },
  { side: "r", at: 2 },
] as const;

function KnownForLeaves({
  knownFor,
  personId,
  tab,
}: {
  knownFor: Promise<KnownForMap>;
  personId: number;
  tab: PeopleTab;
}) {
  const titles = use(knownFor)[tab][personId] ?? [];
  return titles.slice(0, FAN.length).map((title, index) => (
    <DockLink
      aria-label={title.title}
      className={cast.leaf}
      data-at={FAN[index]!.at}
      data-cursor="idle"
      data-side={FAN[index]!.side}
      data-slot="leaf"
      href={mediaHref(title.mediaType, title.id)}
      key={`${title.mediaType}-${title.id}`}
    >
      <Image
        alt=""
        className="object-cover"
        sizes="120px"
        src={tmdbImageUrl("poster", title.posterPath, "w185")}
      />
    </DockLink>
  ));
}

function CastCard({
  index,
  knownFor,
  person,
  tab,
}: {
  index: number;
  knownFor?: Promise<KnownForMap>;
  person: PersonEntry;
  tab: PeopleTab;
}) {
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const src = tmdbImageUrl("profile", photoPath, "h632");
  const href = personHref(person.id);

  return (
    <div className={cast.card}>
      <div className={cast.folder} data-slot="folder">
        <div className={cast.deck} data-slot="deck">
          {knownFor ? (
            <Suspense fallback={null}>
              <KnownForLeaves
                knownFor={knownFor}
                personId={person.id}
                tab={tab}
              />
            </Suspense>
          ) : null}
          <div className={cast.leaf} data-at="0" data-slot="leaf">
            <MediaCard
              aspect="free"
              data-cursor="idle"
              fallbackIcon="solar:user-bold"
              fallbackIconSize={24}
              frameClassName="h-full w-full"
              href={href}
              image={{ sizes: "(min-width: 640px) 140px, 36vw", src }}
              label={`${person.name}, ${person.subtitle}`}
              radius="0.5rem"
            />
          </div>
        </div>
      </div>
      <DockLink
        aria-hidden="true"
        className={cast.flap}
        data-cursor="card"
        data-slot="flap"
        href={href}
        tabIndex={-1}
      >
        <DetailExpose
          as="div"
          className="max-w-full truncate type-base font-semibold text-ink-lead"
          index={index}
          part="credit"
          text={person.name}
          truncate
        />
        <DetailExpose
          as="div"
          className="max-w-full truncate type-meta font-medium tracking-tagline text-ink-muted uppercase"
          index={index}
          part="credit"
          text={person.subtitle}
          truncate
        />
      </DockLink>
    </div>
  );
}

export function MoviePeople({
  cast,
  crew,
  knownFor,
  now = true,
}: MoviePeopleProps) {
  const [openModal] = useModal(PeopleModal);
  const tabs = peopleTabs(cast, crew);
  const [tab, setTab] = useState<PeopleTab>(tabs[0]?.key ?? "cast");
  if (tabs.length === 0) return null;

  const people = tab === "cast" ? cast : crew;
  const featured = people.slice(0, MOVIE_FEATURED_PEOPLE);
  const compact = people.slice(
    MOVIE_FEATURED_PEOPLE,
    MOVIE_FEATURED_PEOPLE + MOVIE_COMPACT_PEOPLE,
  );
  const hasMore = people.length > featured.length + compact.length;

  const openAll = () => {
    void openModal({ cast, crew, initialTab: tab });
  };

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf" now={now}>
      <Heading
        actions={
          <SegmentedControl
            ariaLabel="Cast or crew"
            items={tabs}
            onChange={setTab}
            value={tab}
          />
        }
        icon="solar:users-group-rounded-bold"
        title="Cast & Crew"
      />

      <DetailSwap
        className="flex flex-col gap-3"
        cue="cast"
        id={tab}
        intro="casting"
        now={now}
      >
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
          {featured.map((person, index) => (
            <DetailPart
              as="li"
              className={cn("min-w-0", index >= 4 && "hidden sm:block")}
              index={index}
              key={person.key}
              name="person"
            >
              <CastCard
                index={index}
                knownFor={knownFor}
                person={person}
                tab={tab}
              />
            </DetailPart>
          ))}
        </ul>

        {compact.length > 0 || hasMore ? (
          <div
            className={`grid h-10 gap-3 sm:grid-cols-[repeat(var(--cells),minmax(0,1fr))] ${hasMore ? "grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))_2.5rem]" : "grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))]"}`}
            style={compactCells(compact.length, hasMore)}
          >
            {compact.map((person, index) => (
              <DetailPart
                className={`min-w-0 ${index > 1 ? "hidden sm:block" : ""}`}
                index={featured.length + index}
                key={person.key}
                name="person"
              >
                <PersonCard
                  compact
                  index={featured.length + index}
                  person={person}
                  radius={RADIUS.panel}
                />
              </DetailPart>
            ))}
            <DetailPart
              className="min-w-0"
              index={featured.length + compact.length}
              name="person"
            >
              <Button
                aria-label="Show full cast and crew"
                shape="pill"
                width="full"
                intent="neutral"
                className=""
                onClick={openAll}
              >
                <Icon icon="solar:alt-arrow-right-linear" size={16} />
              </Button>
            </DetailPart>
          </div>
        ) : null}
      </DetailSwap>
    </DetailSection>
  );
}
