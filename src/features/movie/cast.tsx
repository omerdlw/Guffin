"use client";

import { isValidElement, type ReactNode, useState } from "react";
import {
  defineModal,
  ModalContainer,
  type ModalContainerHeaderConfig,
  useModal,
} from "@omerdlw/base-framework/modules/modal";
import { useArtworkPath } from "@/features/artwork/artwork";
import { Heading } from "@/features/detail/layout";
import {
  DetailExpose,
  DetailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import { personHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { DockLink } from "@/design/components/link";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { MediaCard } from "@/design/components/media-card";
import { SegmentedControl } from "@/design/components/segmented-control";
import { cn } from "@/design/foundations/cn";
import { nested, RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { MOVIE_COMPACT_PEOPLE, MOVIE_FEATURED_PEOPLE } from "./constants";
import type {
  CastModalProps,
  MoviePeopleProps,
  PeopleModalData,
  PeopleTab,
  PersonEntry,
} from "./types";
import { compactCells, peopleTabs } from "./utils";
import cast from "./cast.module.css";

function CastCard({ index, person }: { index: number; person: PersonEntry }) {
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const src = tmdbImageUrl("profile", photoPath, "h632");

  const foot = (
    <>
      <div
        aria-hidden="true"
        className={cn(cast.sheen, "pointer-events-none absolute inset-0")}
      />
      <div className="on-photo absolute inset-x-0 bottom-0 flex min-w-0 flex-col px-2.5 pb-3 text-center">
        <DetailExpose
          as="div"
          className="truncate type-control font-semibold text-ink-lead"
          index={index}
          part="credit"
          text={person.name}
          truncate
        />
        <DetailExpose
          as="div"
          className="truncate type-meta font-medium text-ink-body"
          index={index}
          part="credit"
          text={person.subtitle}
          truncate
        />
      </div>
    </>
  );

  return (
    <MediaCard
      aspect="free"
      className="w-full"
      fallbackIcon="solar:user-bold"
      fallbackIconSize={24}
      frameClassName="aspect-[3/4] w-full"
      href={personHref(person.id)}
      image={{ sizes: "(min-width: 768px) 12vw, 44vw", src }}
      label={`${person.name}, ${person.subtitle}`}
      overlay={foot}
      radius={RADIUS.panel}
    />
  );
}

function PersonCard({
  compact = false,
  index,
  onNavigated,
  person,
  radius,
  dense = false,
}: {
  compact?: boolean;
  dense?: boolean;
  index?: number;
  onNavigated?: () => void;
  person: PersonEntry;
  radius?: number;
}) {
  const staged = index !== undefined;
  const photoRadius = radius === undefined ? undefined : nested(radius, 4);
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const src = tmdbImageUrl("profile", photoPath, "h632");
  const href = personHref(person.id);

  const photo = (
    <MediaCard
      aspect="free"
      className="shrink-0"
      fallbackIcon="solar:user-bold"
      fallbackIconSize={compact ? 14 : 20}
      frameClassName={compact ? "size-8" : dense ? "h-12 w-9" : "h-[76px] w-14"}
      framed={false}
      image={{ sizes: compact ? "32px" : dense ? "36px" : "56px", src }}
      radius={photoRadius}
    />
  );

  const text = (value: string, className: string): ReactNode =>
    staged ? (
      <DetailExpose
        as="div"
        className={className}
        index={index}
        part="credit"
        text={value}
        truncate
      />
    ) : (
      <div className={className}>{value}</div>
    );

  return (
    <DockLink
      aria-label={`${person.name}, ${person.subtitle}`}
      href={href}
      onNavigated={onNavigated}
      className={cn(
        "cine-card cine-fade relative flex items-center gap-3 overflow-hidden",
        TONE.surface,
        compact
          ? "h-10 min-w-0 flex-1 p-1 pr-2"
          : dense
            ? "h-14 p-1 pr-3"
            : "h-[84px] p-1 pr-4",
      )}
      style={radius === undefined ? undefined : { borderRadius: radius }}
    >
      {photo}

      {compact ? (
        text(person.name, "min-w-0 truncate type-meta font-semibold text-ink")
      ) : (
        <div className={cn("flex min-w-0 flex-col", dense && "gap-0.5")}>
          {text(
            person.name,
            dense
              ? "truncate type-body font-medium tracking-tight text-ink"
              : "truncate type-body font-semibold text-ink",
          )}
          {text(
            person.subtitle,
            dense
              ? "truncate type-meta text-ink-muted"
              : `truncate ${TONE.label} text-ink-muted`,
          )}
        </div>
      )}
    </DockLink>
  );
}

function PeopleModalView({
  close,
  data,
  header,
}: CastModalProps<PeopleModalData>) {
  const [tab, setTab] = useState(data.initialTab);
  const tabs = peopleTabs(data.cast, data.crew);
  const people = tab === "cast" ? data.cast : data.crew;

  const control = (
    <SegmentedControl
      ariaLabel="Cast or crew"
      items={tabs}
      onChange={setTab}
      value={tab}
    />
  );
  const inHeader =
    !!header && typeof header === "object" && !isValidElement(header);
  const headerConfig = inHeader
    ? { ...(header as ModalContainerHeaderConfig), actions: control }
    : header;

  return (
    <ModalContainer close={close} header={headerConfig}>
      <div className="flex w-[min(40rem,calc(100vw-2rem))] max-w-full flex-col gap-3">
        {inHeader ? null : control}
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {people.map((person) => (
            <li className="min-w-0" key={person.key}>
              <PersonCard
                dense
                onNavigated={() => close()}
                person={person}
                radius={RADIUS.card}
              />
            </li>
          ))}
        </ul>
      </div>
    </ModalContainer>
  );
}

const PeopleModal = defineModal({
  component: PeopleModalView,
  position: { desktop: "center", mobile: "bottom" },
  title: "Cast & crew",
});

export function MoviePeople({ cast, crew, now = true }: MoviePeopleProps) {
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
    const data: PeopleModalData = { cast, crew, initialTab: tab };
    void openModal(data);
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {featured.map((person, index) => (
            <DetailPart
              as="li"
              className="min-w-0"
              index={index}
              key={person.key}
              name="person"
            >
              <CastCard index={index} person={person} />
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
                className="cine-press ui-still"
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
