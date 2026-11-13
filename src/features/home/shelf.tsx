import type { JSX, ReactNode } from "react";
import { Avatar } from "@omerdlw/base-framework/ui";
import { Carousel } from "@/design/components/carousel";
import { DockLink } from "@/design/components/link";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { accountHref, movieHref } from "@/lib/project";
import {
  type HomeFilm,
  type Member,
  ROW_ITEM_CLASS,
  TEXT_LINK_CLASS,
} from "./feed";
import { Heading, HomeSection } from "./motion";

export function MemberLink({
  className,
  member,
  size = 20,
}: {
  className?: string;
  member: Member;
  size?: number;
}): JSX.Element {
  return (
    <DockLink
      className={cn(
        "flex min-w-0 items-center gap-2 font-semibold text-ink-body hover:text-ink focus-visible:text-ink",
        className,
      )}
      href={accountHref(member.username)}
    >
      <Avatar
        className="shrink-0 rounded-full"
        name={member.displayName}
        size={size}
        src={member.avatarUrl ?? undefined}
      />
      <span className="truncate">{member.displayName}</span>
    </DockLink>
  );
}

export function FilmTitle({
  as: Tag = "h3",
  className,
  film,
}: {
  as?: "h3" | "p";
  className?: string;
  film: HomeFilm;
}): JSX.Element {
  return (
    <Tag className={cn("flex min-w-0 items-baseline gap-2", className)}>
      <DockLink
        className={`truncate font-semibold text-ink ${TEXT_LINK_CLASS}`}
        href={movieHref(film.id)}
      >
        {film.title}
      </DockLink>
      {film.year ? (
        <span className="shrink-0 text-ink-muted tabular-nums">
          {film.year}
        </span>
      ) : null}
    </Tag>
  );
}

export function Shelf({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <HomeSection className="flex w-full flex-col" cue="row">
      <Heading actions={actions} title={title} />
      <Carousel
        arrowClassName={TONE.arrows}
        itemClassName={ROW_ITEM_CLASS}
        label={title}
        part="slide"
      >
        {children}
      </Carousel>
    </HomeSection>
  );
}
