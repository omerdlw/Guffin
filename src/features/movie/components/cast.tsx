"use client";

import { type CSSProperties, Fragment, Suspense, use, useState } from "react";
import { useModal } from "@omerdlw/base-framework/modal";
import { Image } from "@omerdlw/base-framework/ui";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { Tooltip } from "@/design/components/tooltip";
import { nested, RADIUS } from "@/design/foundations/geometry";
import { CHOSEN, SHELL } from "@/design/foundations/layers";
import { cn } from "@/design/ui";
import { useArtworkPath } from "@/features/artwork/components/artwork";
import { Heading } from "@/features/detail-page/components/layout";
import {
  DetailExpose,
  detailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail-page/motion";
import { movieHref, personHref } from "@/shared/site";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import styles from "./cast.module.css";
import {
  CAST_SEATS,
  type KnownForMap,
  MOVIE_FEATURED_PEOPLE,
  type PeopleTab,
  peopleTabs,
  type PersonEntry,
} from "../model";
import { PeopleModal } from "./people-modal";

interface MoviePeopleProps {
  cast: PersonEntry[];
  crew: PersonEntry[];
  knownFor?: Promise<KnownForMap>;
  now?: boolean;
}

const MOVIE_COMPACT_PEOPLE = 3;

const STACK = {
  "--photo": "40cqi",
  "--grow": "2.86",
  "--pad": "0.375rem",
  "--poster": "7.5cqi",
} as CSSProperties;

const CARD_RADIUS = nested(RADIUS.shell, 6);

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
  return titles.map((title, index) => (
    <Tooltip
      data-cursor-owned=""
      key={title.id}
      position="bottom"
      text={title.title}
      triggerClassName={styles.tip}
    >
      <DockLink
        aria-label={title.title}
        className={styles.leaf}
        data-cursor="card"
        data-cursor-label=""
        data-slot="leaf"
        href={movieHref(title.id)}
        style={{ "--i": index } as CSSProperties}
      >
        <Image
          alt=""
          className="object-cover"
          sizes="56px"
          src={tmdbImageUrl("poster", title.posterPath, "w154")}
        />
      </DockLink>
    </Tooltip>
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
  const seat = CAST_SEATS[index]!;
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const src = tmdbImageUrl("profile", photoPath, "h632");

  return (
    <li
      {...detailPart("person")}
      className={styles.seat}
      data-lead={index === 0 ? "" : undefined}
      style={
        {
          "--i": index,
          order: seat.order,
          "--gather": `${-seat.x}cqi`,
        } as CSSProperties
      }
    >
      <div className={styles.holder} data-slot="deck">
        <div
          aria-hidden="true"
          className={cn(styles.frame, SHELL, CHOSEN, "rounded-shell")}
          data-slot="folder"
        />
        <DockLink
          aria-label={`${person.name}, ${person.subtitle}`}
          className={cn(styles.card, "bg-fill")}
          data-cursor="idle"
          href={personHref(person.id)}
          style={{ borderRadius: CARD_RADIUS }}
        >
          {src ? (
            <span className={styles.photo} data-slot="picture">
              <Image
                alt=""
                className="object-cover object-top"
                sizes="(min-width: 768px) 280px, 40vw"
                src={src}
              />
            </span>
          ) : (
            <span className={styles.glyph}>
              <Icon
                className="text-ink-faint"
                icon="solar:user-bold"
                size={32}
              />
            </span>
          )}
          <span aria-hidden="true" className={styles.shade} data-slot="shade" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-page/80 via-page/30 to-transparent"
          />
          <span aria-hidden="true" className={styles.spine}>
            <span
              className={cn(
                styles.spineText,
                "type-meta font-semibold tracking-tagline text-ink uppercase",
              )}
              data-slot="spine"
            >
              {person.name}
            </span>
          </span>
          <span className={styles.caption}>
            <span className={styles.captionLines} data-slot="caption">
              <DetailExpose
                as="span"
                className={cn(
                  "block max-w-full truncate type-copy font-semibold text-ink",
                )}
                index={index}
                part="credit"
                text={person.name}
                truncate
              />
              <DetailExpose
                as="span"
                className="block max-w-full truncate type-micro font-medium tracking-tagline text-ink-body uppercase"
                index={index}
                part="credit"
                text={person.subtitle}
                truncate
              />
            </span>
          </span>
        </DockLink>
        {knownFor ? (
          <div className={styles.shelf}>
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
    </li>
  );
}

function CreditRoll({
  compact,
  first,
  more,
  onMore,
}: {
  compact: PersonEntry[];
  first: number;
  more: number;
  onMore: () => void;
}) {
  return (
    <div className={styles.roll}>
      {compact.length > 0 ? <span className={styles.joiner}>with</span> : null}
      {compact.map((person, index) => (
        <Fragment key={person.id}>
          {index > 0 ? (
            <span aria-hidden="true" className={styles.dot}>
              ·
            </span>
          ) : null}
          <CreditName index={first + index} person={person} />
        </Fragment>
      ))}
      {more > 0 ? (
        <button
          {...detailPart("cameo")}
          aria-label="Show full cast and crew"
          className={styles.more}
          style={{ "--i": first + compact.length } as CSSProperties}
          data-cursor-fit="ink"
          onClick={onMore}
          type="button"
        >
          {compact.length > 0 ? "and " : ""}
          {more} more
          <Icon icon="solar:alt-arrow-right-linear" size={14} />
        </button>
      ) : null}
    </div>
  );
}

function CreditName({ index, person }: { index: number; person: PersonEntry }) {
  return (
    <DockLink
      {...detailPart("cameo")}
      aria-label={`${person.name}, ${person.subtitle}`}
      className={styles.name}
      data-cursor-fit="ink"
      href={personHref(person.id)}
      style={{ "--i": index } as CSSProperties}
    >
      {person.profilePath ? (
        <span aria-hidden="true" className={styles.face} data-slot="thumb">
          <Image
            alt=""
            className="object-cover object-top"
            sizes="88px"
            src={tmdbImageUrl("profile", person.profilePath, "w185")}
          />
        </span>
      ) : null}
      {person.name}
    </DockLink>
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
    <DetailSection
      className={cn(styles.section, "flex w-full flex-col")}
      cue="shelf"
      now={now}
    >
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
        <ul className={styles.stack} style={STACK}>
          {featured.map((person, index) => (
            <CastCard
              index={index}
              key={person.id}
              knownFor={knownFor}
              person={person}
              tab={tab}
            />
          ))}
        </ul>

        {compact.length > 0 || hasMore ? (
          <CreditRoll
            compact={compact}
            first={featured.length}
            more={people.length - featured.length - compact.length}
            onMore={openAll}
          />
        ) : null}
      </DetailSwap>
    </DetailSection>
  );
}
