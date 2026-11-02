"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { personHref } from "@/config/routes";
import { useArtworkPath } from "@/features/artwork";
import { MediaCard, nested, TONE, useDockLinkClick } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { cn } from "@/ui/cn";
import { DetailExpose, DetailPart } from "@/features/detail";
import type { PersonEntry } from "../types";

// A credit as a card. On the page (`index` given) the photo opens like a door
// and the name and role are printed as the card comes in; in a modal, off the
// page's stage, the card is simply there.
export function PersonCard({
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
