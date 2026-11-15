"use client";

import { type CSSProperties, Suspense, use, useState } from "react";
import { useModal } from "@omerdlw/base-framework/modal";
import { Button, Image } from "@omerdlw/base-framework/ui";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { nested, RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
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

// The fan's leaves, innermost first.
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
        sizes="40px"
        src={tmdbImageUrl("poster", title.posterPath, "w92")}
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
  const src = tmdbImageUrl("profile", photoPath, "w185");
  const href = personHref(person.id);

  return (
    <div className={cn(cast.card, "rounded-panel", TONE.surface)}>
      <DockLink
        aria-label={`${person.name}, ${person.subtitle}`}
        className="flex items-center gap-3 p-1.5 pr-[6.5rem]"
        data-cursor="card"
        href={href}
      >
        <MediaCard
          aspect="free"
          className="shrink-0"
          fallbackIcon="solar:user-bold"
          fallbackIconSize={20}
          frameClassName="h-[84px] w-14"
          framed={false}
          image={{ sizes: "56px", src }}
          radius={nested(RADIUS.panel, 6)}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
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
        </div>
      </DockLink>
      {knownFor ? (
        <div aria-hidden="true" className={cast.deck}>
          <Suspense fallback={null}>
            <KnownForLeaves
              knownFor={knownFor}
              personId={person.id}
              tab={tab}
            />
          </Suspense>
        </div>
      ) : null}
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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {featured.map((person, index) => (
            <DetailPart
              as="li"
              className="min-w-0"
              index={index}
              key={person.id}
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
                key={person.id}
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
