"use client";

import { type ReactNode, useState } from "react";
import {
  type AmbientPalette,
  useAmbientTheme,
} from "@omerdlw/base-framework/ambient";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { usePage } from "@omerdlw/base-framework/kernel";
import {
  useArrival,
  useDeparture,
  useNavigationPayload,
} from "@omerdlw/base-framework/navigation";
import { HighlightGroup, useHighlight } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { ExternalLink, TextButton } from "@/design/components/link";
import { Tooltip } from "@/design/components/tooltip";
import {
  headlineClass,
  PROSE_CLASS,
  RULE_GAP,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { useSurfacePreload } from "@/design/lazy-surface";
import { cn } from "@/design/ui";
import {
  ArtworkPrint,
  useArtworkContextMenu,
  useArtworkPath,
} from "@/features/artwork/artwork";
import {
  DetailBloom,
  DetailCount,
  DetailExpose,
  DetailPart,
  DetailText,
} from "@/features/detail/motion";
import {
  DetailBackdrop,
  DetailIntermission,
  DetailStage,
} from "@/features/detail/stage";
import {
  type Awards,
  type PersonDetails,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { readable } from "@/motion/gl";
import { countFilms, getBackdropPath, personSwatch } from "./credits";
import { describePerson, PERSON_LINKS_CLASS, type SocialLink } from "./person";
import { personBioSurface } from "./surfaces";

const PERSON_FALLBACK_ICON = "solar:user-bold";

const personNameClass = (name: string) => headlineClass(name, [20, 30, 42]);

const formatYears = (count: number) => `${count} years`;

function HeaderRule({
  links,
  name,
  role,
}: {
  links: readonly SocialLink[];
  name: string;
  role: string | null;
}) {
  return (
    <div className={cn(RULE_GAP, "flex items-center gap-4")}>
      {role ? (
        <DetailExpose
          className={cn(TONE.label, "shrink-0 text-ink-body")}
          part="role"
          text={role}
        />
      ) : null}
      <DetailPart className="h-px min-w-6 flex-1 bg-grade/40" name="rule" />
      {links.length > 0 ? <ProfileLinks links={links} name={name} /> : null}
    </div>
  );
}

function ProfileLink({
  index,
  link,
  name,
}: {
  index: number;
  link: SocialLink;
  name: string;
}) {
  const highlight = useHighlight(link.key, "rounded-full bg-fill-hover");

  return (
    <li className="relative isolate">
      {highlight.node}
      <DetailPart index={index} name="link">
        <Tooltip position="top" text={link.label}>
          <ExternalLink
            aria-label={`${name} on ${link.label}`}
            className="center relative z-10 size-9 rounded-full text-ink-body hover:text-ink focus-visible:text-ink"
            href={link.url}
            referrerPolicy="no-referrer"
            {...highlight.props}
          >
            <Icon icon={link.icon} size={20} />
          </ExternalLink>
        </Tooltip>
      </DetailPart>
    </li>
  );
}

function ProfileLinks({
  links,
  name,
}: {
  links: readonly SocialLink[];
  name: string;
}) {
  return (
    <HighlightGroup>
      <ul aria-label="Profiles" className={PERSON_LINKS_CLASS}>
        {links.map((link, index) => (
          <ProfileLink index={index} key={link.key} link={link} name={name} />
        ))}
      </ul>
    </HighlightGroup>
  );
}

function BiographyExcerpt({
  excerpt,
  full,
  name,
  truncated,
}: {
  excerpt: string;
  full: string;
  name: string;
  truncated: boolean;
}) {
  const { openSurface } = useDockActions();
  useSurfacePreload(personBioSurface);

  const openFull = () => {
    void personBioSurface.open(openSurface, {
      data: { biography: full, name },
    });
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <DetailText
        as="p"
        className={cn(PROSE_CLASS, "opacity-70")}
        part="overview"
        text={excerpt}
      />
      {truncated ? (
        <DetailPart index={Number.MAX_SAFE_INTEGER} name="overview">
          <TextButton
            aria-label={`Read the full biography of ${name}`}
            onClick={openFull}
            variant="label"
          >
            Read more
          </TextButton>
        </DetailPart>
      ) : null}
    </div>
  );
}

export function PersonHeader({
  biography,
  excerpt,
  links,
  name,
  role,
  truncated,
}: {
  biography: string | null;
  excerpt: string | null;
  links: readonly SocialLink[];
  name: string;
  role: string | null;
  truncated: boolean;
}) {
  return (
    <>
      <DetailBloom
        as="h1"
        className={personNameClass(name)}
        part="title"
        text={name}
      />
      <HeaderRule links={links} name={name} role={role} />
      {biography && excerpt ? (
        <BiographyExcerpt
          excerpt={excerpt}
          full={biography}
          name={name}
          truncated={truncated}
        />
      ) : null}
    </>
  );
}

export function AgeCount({ index, value }: { index: number; value: number }) {
  return (
    <DetailCount
      format={formatYears}
      hover
      index={index}
      part="value"
      value={value}
    />
  );
}

export function PersonPortrait({
  awards,
  person,
}: {
  awards?: Promise<Awards | null>;
  person: Pick<PersonDetails, "id" | "name" | "profilePath">;
}) {
  const path = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );

  return (
    <ArtworkPrint
      alt={person.name}
      awards={awards}
      className="@container w-full shrink-0"
      fallbackIcon={PERSON_FALLBACK_ICON}
      frameClassName="h-[round(150cqw,1px)]"
      part="poster"
      path={path}
      src={tmdbImageUrl("profile", path, "h632")}
    />
  );
}

export function PersonBackdropHero({
  fallback,
  person,
}: {
  fallback: string | null;
  person: Pick<PersonDetails, "id" | "name">;
}) {
  const path = useArtworkPath("person", person.id, "backdrop", fallback);
  const image = tmdbImageUrl("backdrop", path, "original");
  return image ? <DetailBackdrop src={image} title={person.name} /> : null;
}

export function PersonPageChrome({
  palette = null,
  person,
}: {
  palette?: AmbientPalette | null;
  person: PersonDetails;
}): null {
  const defaultBackdrop = getBackdropPath(person);
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const backdropPath = useArtworkPath(
    "person",
    person.id,
    "backdrop",
    defaultBackdrop,
  );
  const photo = tmdbImageUrl("profile", photoPath, "w185");
  const swatch = personSwatch(backdropPath, photoPath);

  useArtworkContextMenu({
    defaults: { backdrop: defaultBackdrop, poster: person.profilePath },
    id: person.id,
    kind: "person",
  });

  const departure = useDeparture()?.href;
  const arrival = useArrival();

  usePage({
    title: person.name,
    dock: {
      description: describePerson(person, countFilms(person)) || undefined,
      icon: photo ?? PERSON_FALLBACK_ICON,
      name: `person-${person.id}`,
      targetPath: departure,
    },
  });
  const [inherited] = useState(() => arrival?.payload.palette ?? undefined);
  const { palette: lit } = useAmbientTheme({
    image: swatch,
    initialPalette: palette?.source === swatch ? palette : inherited,
  });
  useNavigationPayload("palette", lit);

  return null;
}

export function PersonStage({
  backdrop,
  children,
  person,
}: {
  backdrop: string | null;
  children: ReactNode;
  person: Pick<PersonDetails, "id" | "profilePath">;
}) {
  const path = useArtworkPath("person", person.id, "backdrop", backdrop);
  const photo = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );

  return (
    <DetailStage picture={personSwatch(path, photo)}>{children}</DetailStage>
  );
}

export function PersonProjection({
  backdrop,
  person,
}: {
  backdrop: string | null;
  person: Pick<PersonDetails, "id" | "name" | "profilePath">;
}) {
  const path = useArtworkPath("person", person.id, "backdrop", backdrop);
  const photo = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const picture = tmdbImageUrl("backdrop", path, "original");

  return (
    <DetailIntermission
      image={
        picture ? readable(picture) : tmdbImageUrl("profile", photo, "original")
      }
      title={person.name}
    />
  );
}
