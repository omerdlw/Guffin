"use client";

import { type CSSProperties, Fragment, Suspense, use, useState } from "react";
import { useModal } from "@omerdlw/base-framework/modal";
import { Image } from "@omerdlw/base-framework/ui";
import { SegmentedControl } from "@/design/components/segmented-control";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { Tooltip } from "@/design/components/tooltip";
import { nested, RADIUS } from "@/design/foundations/geometry";
import { SHELL } from "@/design/foundations/layers";
import { cn } from "@/design/ui";
import { useArtworkPath } from "@/features/artwork/artwork";
import { Heading } from "@/features/detail/layout";
import {
  DetailExpose,
  detailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import { mediaHref, personHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import styles from "./cast.module.css";
import {
  CAST_SEATS,
  type KnownForMap,
  MOVIE_FEATURED_PEOPLE,
  type PeopleTab,
  peopleTabs,
  type PersonEntry,
} from "./movie";
import { PeopleModal } from "./people-modal";

interface MoviePeopleProps {
  cast: PersonEntry[];
  crew: PersonEntry[];
  knownFor?: Promise<KnownForMap>;
  now?: boolean;
}

const MOVIE_COMPACT_PEOPLE = 3;

const STACK = {
  // A seat's width at the front (cqi).
  "--front": "38cqi",
  // The frame's margin around the picture, and a known-for poster's width.
  "--pad": "0.375rem",
  "--poster": "7.5cqi",
} as CSSProperties;

const FOOT = "cast-foot";

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
      key={`${title.mediaType}-${title.id}`}
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
        href={mediaHref(title.mediaType, title.id)}
        style={{ "--leaf": index } as CSSProperties}
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

// The foot: the portrait's face stays sharp and its foot melts into a soft
// field of its own colours, as iOS's scroll edge does. Three blurs, each
// deeper and starting lower, laid over one another through alpha ramps
// (one blur under a single ramp would show the sharp and the blurred
// picture doubled half way down). The deepest is dimmed a touch so the
// name on it reads. Every blur repeats the picture's edge (`duplicate`), so
// no dark halo creeps in from outside. Drawn once per page; every portrait
// in the stack takes it.
const ramp = (from: number, to: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none"><linearGradient id="r" x2="0" y2="1"><stop offset="${from}" stop-color="white" stop-opacity="0"/><stop offset="${to}" stop-color="white"/></linearGradient><rect width="1" height="1" fill="url(#r)"/></svg>`,
  )}`;

/** Each step: its blur (px σ) and where down the picture it fades in. */
const FOOT_STEPS = [
  { blur: 2.5, from: 0.7, to: 0.8 },
  { blur: 8, from: 0.75, to: 0.87 },
  { blur: 18, from: 0.8, to: 0.95 },
] as const;

function FootFilter() {
  return (
    <svg aria-hidden="true" className="absolute size-0">
      <filter
        colorInterpolationFilters="sRGB"
        height="100%"
        id={FOOT}
        width="100%"
        x="0%"
        y="0%"
      >
        {FOOT_STEPS.map(({ blur, from, to }, step) => {
          const deepest = step === FOOT_STEPS.length - 1;
          const under = step === 0 ? "SourceGraphic" : `step${step - 1}`;
          return (
            <Fragment key={step}>
              <feImage
                height="100%"
                href={ramp(from, to)}
                preserveAspectRatio="none"
                result={`ramp${step}`}
                width="100%"
                x="0%"
                y="0%"
              />
              <feGaussianBlur
                edgeMode="duplicate"
                in="SourceGraphic"
                result={`blur${step}`}
                stdDeviation={blur}
              />
              {deepest ? (
                <feComponentTransfer in={`blur${step}`} result={`blur${step}`}>
                  <feFuncR slope={0.72} type="linear" />
                  <feFuncG slope={0.72} type="linear" />
                  <feFuncB slope={0.72} type="linear" />
                </feComponentTransfer>
              ) : null}
              <feComposite
                in={`blur${step}`}
                in2={`ramp${step}`}
                operator="in"
                result={`cut${step}`}
              />
              <feComposite
                in={`cut${step}`}
                in2={under}
                operator="over"
                result={`step${step}`}
              />
            </Fragment>
          );
        })}
      </filter>
    </svg>
  );
}

// A person in the stack: their portrait, its foot melting into a soft field
// of its own colours, with their name on it. Under the hand the seat comes to the
// front, a glass frame opens around the portrait and runs down under it,
// and the person's known-for posters surface on it.
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
  const lead = seat.at === 0;

  return (
    <li
      {...detailPart("person")}
      className={styles.seat}
      data-at={seat.at}
      style={
        {
          "--i": index,
          "--x": `${seat.x}cqi`,
          // Every portrait is laid out at the front's size and scaled down
          // to its seat: under the hand it grows by transform alone, so
          // nothing reflows and the foot's blur is not redrawn per frame.
          "--s": seat.w / CAST_SEATS[0]!.w,
          "--gather": `${-seat.x}cqi`,
        } as CSSProperties
      }
    >
      <div className={styles.holder} data-slot="deck">
        <div
          aria-hidden="true"
          className={cn(styles.frame, SHELL, "rounded-shell")}
          data-slot="folder"
        />
        <DockLink
          aria-label={`${person.name}, ${person.subtitle}`}
          className={cn(styles.card, "on-photo bg-fill")}
          data-cursor="idle"
          href={personHref(person.id)}
          style={{ borderRadius: CARD_RADIUS }}
        >
          {src ? (
            <span className={styles.photo}>
              <Image
                alt=""
                className="object-cover object-top"
                sizes="(min-width: 768px) 280px, 40vw"
                src={src}
              />
            </span>
          ) : (
            <Icon
              className="center text-ink-faint"
              icon="solar:user-bold"
              size={32}
            />
          )}
          <span className={styles.caption} data-slot="caption">
            <DetailExpose
              as="span"
              className={cn(
                "block max-w-full truncate font-semibold text-ink",
                lead ? "type-copy" : "type-meta",
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

// The rest of the cast, rolled as an end credit under the stack: one
// centred line, no boxes. Under the hand a name's face blooms above it as a
// small drop; the line ends on how many more there are, which opens the
// whole cast.
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
        <span
          aria-hidden="true"
          className={styles.face}
          data-slot="thumb"
        >
          <Image
            alt=""
            className="object-cover object-top"
            sizes="48px"
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
        <FootFilter />
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
