"use client";

import { type ReactNode, useState } from "react";
import {
  defineModal,
  ModalContainer,
  useModal,
} from "@omerdlw/base-framework/modules/modal";
import Link from "next/link";
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
import { useShowing } from "@/motion/kit";
import { Tube } from "@/motion/screen";
import { Button, useDockLinkClick } from "@/ui/button";
import { cn } from "@/ui/cn";
import { SegmentedControl } from "@/ui/form";
import { Icon, MediaCard } from "@/ui/media";
import { nested, RADIUS, TONE } from "@/ui/tokens";
import {
  CAST_BLUR_STEPS,
  MOVIE_COMPACT_PEOPLE,
  MOVIE_FEATURED_PEOPLE,
} from "./constants";
import type {
  CastModalProps,
  MoviePeopleProps,
  PeopleModalData,
  PeopleTab,
  PersonEntry,
  VideoModalData,
} from "./types";
import { castBlurLayer, compactCells } from "./utils";

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
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
      >
        {CAST_BLUR_STEPS.map((blur, step) => (
          <div
            className="cast-blur absolute inset-0"
            key={blur}
            style={castBlurLayer(step)}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="cast-sheen pointer-events-none absolute inset-0"
      />
      <div className="absolute inset-x-0 bottom-0 flex min-w-0 flex-col px-2.5 pb-3 text-center drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]">
        <DetailExpose
          as="div"
          className="truncate type-control font-semibold text-ink-lead"
          index={index}
          part="name"
          text={person.name}
          truncate
        />
        <DetailExpose
          as="div"
          className="truncate type-meta font-medium text-ink-body"
          index={index}
          part="name"
          text={person.subtitle}
          truncate
        />
      </div>
    </>
  );

  return (
    <DetailPart index={index} name="photo">
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
    </DetailPart>
  );
}

function PersonCard({
  compact = false,
  index,
  onNavigated,
  person,
  radius,
}: {
  compact?: boolean;
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
  const handleClick = useDockLinkClick(href, onNavigated);

  const photo = (
    <MediaCard
      aspect="free"
      className="shrink-0"
      fallbackIcon="solar:user-bold"
      fallbackIconSize={compact ? 14 : 20}
      frameClassName={compact ? "size-8" : "h-[76px] w-14"}
      framed={false}
      image={{ sizes: compact ? "32px" : "56px", src }}
      radius={photoRadius}
    />
  );

  const text = (value: string, className: string): ReactNode =>
    staged ? (
      <DetailExpose
        as="div"
        className={className}
        index={index}
        part="name"
        text={value}
        truncate
      />
    ) : (
      <div className={className}>{value}</div>
    );

  return (
    <Link
      aria-label={`${person.name}, ${person.subtitle}`}
      href={href}
      onClick={handleClick}
      prefetch={false}
      className={cn(
        "cine-card cine-fade relative flex items-center gap-3 overflow-hidden",
        TONE.surface,
        compact ? "h-10 min-w-0 flex-1 p-1 pr-2" : "h-[84px] p-1 pr-4",
      )}
      style={radius === undefined ? undefined : { borderRadius: radius }}
    >
      {staged ? (
        <div
          className="shrink-0 overflow-hidden"
          style={{ borderRadius: photoRadius }}
        >
          <DetailPart index={index} name="photo">
            {photo}
          </DetailPart>
        </div>
      ) : (
        photo
      )}

      {compact ? (
        text(person.name, "min-w-0 truncate type-meta font-semibold text-ink")
      ) : (
        <div className="flex min-w-0 flex-col">
          {text(person.name, "truncate type-body font-semibold text-ink")}
          {text(person.subtitle, `truncate ${TONE.label} text-ink-muted`)}
        </div>
      )}
    </Link>
  );
}

function PeopleModalView({
  close,
  data,
  header,
}: CastModalProps<PeopleModalData>) {
  const [tab, setTab] = useState(data.initialTab);
  const tabs = [
    ...(data.cast.length ? [{ key: "cast" as const, label: "Cast" }] : []),
    ...(data.crew.length ? [{ key: "crew" as const, label: "Crew" }] : []),
  ];
  const people = tab === "cast" ? data.cast : data.crew;

  return (
    <ModalContainer close={close} header={header}>
      <div className="flex flex-col gap-3">
        <SegmentedControl
          ariaLabel="Cast or crew"
          round
          items={tabs}
          onChange={setTab}
          value={tab}
        />
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {people.map((person) => (
            <li className="min-w-0" key={person.key}>
              <PersonCard
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

function VideoModalView({ data }: CastModalProps<VideoModalData>) {
  useShowing();
  return (
    <Tube className="aspect-video w-[min(92vw,64rem)] overflow-hidden rounded-sheet bg-black ring-1 ring-edge-hover ring-inset">
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.key)}?autoplay=1&rel=0`}
        title={data.name}
      />
    </Tube>
  );
}

export const VideoModal = defineModal({
  chrome: "bare",
  component: VideoModalView,
  position: "center",
});

export function MoviePeople({ cast, crew }: MoviePeopleProps) {
  const [openModal] = useModal(PeopleModal);
  const tabs = [
    ...(cast.length ? [{ key: "cast" as const, label: "Cast" }] : []),
    ...(crew.length ? [{ key: "crew" as const, label: "Crew" }] : []),
  ];
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
    <DetailSection className="flex w-full flex-col" cue="shelf" now>
      <Heading
        actions={
          <SegmentedControl
            ariaLabel="Cast or crew"
            className={TONE.tabs}
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
        now
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
                className={TONE.more}
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
