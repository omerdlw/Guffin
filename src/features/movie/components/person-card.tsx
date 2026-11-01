"use client";

import Link from "next/link";
import { personHref } from "@/config/routes";
import { useArtworkPath } from "@/features/artwork";
import { MediaCard, nested, TONE, useDockLinkClick } from "@/ui";
import { SCENE } from "../lib/motion";
import { Develop, Expose } from "@/motion/stage";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { cn } from "@omerdlw/base-framework/utils";
import type { PersonEntry } from "../lib/types";

export function PersonCard({
  compact = false,
  onNavigated,
  person,
  radius,
}: {
  compact?: boolean;
  onNavigated?: () => void;
  person: PersonEntry;
  radius?: number;
}) {
  // The photo sits one p-1 in from the card's edge.
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
      <Develop at={SCENE.card.photo} className="shrink-0" radius={photoRadius}>
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
      </Develop>

      {compact ? (
        <Expose
          as="div"
          className="min-w-0 truncate text-xs leading-4 font-semibold text-ink"
          since={SCENE.card.name}
          truncate
        >
          {person.name}
        </Expose>
      ) : (
        <div className="flex min-w-0 flex-col">
          <Expose
            as="div"
            className="truncate text-sm leading-5 font-semibold text-ink"
            since={SCENE.card.name}
            truncate
          >
            {person.name}
          </Expose>
          <Expose
            as="div"
            className={`truncate ${TONE.label} text-ink-muted`}
            since={SCENE.card.role}
            truncate
          >
            {person.subtitle}
          </Expose>
        </div>
      )}
    </Link>
  );
}
