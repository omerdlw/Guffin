"use client";

import { isValidElement, type ReactNode, useState } from "react";
import {
  defineModal,
  ModalContainer,
  type ModalContainerHeaderConfig,
} from "@omerdlw/base-framework/modal";
import { SegmentedControl } from "@omerdlw/base-framework/ui";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { nested, RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { useArtworkPath } from "@/features/artwork/artwork";
import { DetailExpose } from "@/features/detail/motion";
import { personHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  type CastModalProps,
  type PeopleModalData,
  peopleTabs,
  type PersonEntry,
} from "./movie";

export function PersonCard({
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

export const PeopleModal = defineModal({
  component: PeopleModalView,
  position: { desktop: "center", mobile: "bottom" },
  title: "Cast & crew",
});
