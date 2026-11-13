"use client";

import { type ReactNode, type RefObject, useLayoutEffect, useRef } from "react";
import { Avatar } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { RADIUS } from "@/design/foundations/geometry";
import { useArtworkPath } from "@/features/artwork/artwork";
import { departmentRole } from "@/features/person/person";
import { RatingStars } from "@/features/reviews/rating";
import { pluralize } from "@/lib/format";
import { accountHref, listHref, personHref, reviewHref } from "@/lib/project";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  folded,
  type ListSearchHit,
  type ReviewSearchHit,
  type UserSearchHit,
} from "./query";

interface PersonResultRowProps {
  person: {
    department: string | null;
    id: number;
    knownFor?: readonly string[];
    name: string;
    profilePath: string | null;
  };
  onNavigated?: () => void;
  query?: string;
}

const RESULT_THUMB_WIDTHS = ["w185"] as const;

const HIGHLIGHT_HALO = 4;

function locateMatch(text: string, query: string): [number, number] | null {
  const needle = folded(query).value.trim();
  if (!needle) return null;
  const { origin, value } = folded(text);

  const atWord = ` ${value}`.indexOf(` ${needle}`);
  const at = atWord >= 0 ? atWord : value.indexOf(needle);
  if (at < 0) return null;

  const last = origin[at + needle.length - 1];
  const end = last + String.fromCodePoint(text.codePointAt(last) ?? 0).length;
  return [origin[at], end];
}

function offsetIn(list: HTMLElement, option: HTMLElement) {
  const box = list.getBoundingClientRect();
  const rect = option.getBoundingClientRect();
  const scale = list.offsetWidth ? box.width / list.offsetWidth : 1;
  return {
    height: rect.height / scale,
    width: rect.width / scale,
    x: (rect.left - box.left) / scale - list.clientLeft + list.scrollLeft,
    y: (rect.top - box.top) / scale - list.clientTop + list.scrollTop,
  };
}

function ResultRow({
  href,
  label,
  meta,
  onNavigated,
  thumb,
  title,
}: {
  href: string;
  label: string;
  meta: ReactNode;
  onNavigated?: () => void;
  thumb: ReactNode;
  title: ReactNode;
}) {
  return (
    <DockLink
      aria-label={label}
      className="group relative z-10 flex h-16 items-center gap-3 rounded-card p-2 pr-4 outline-none focus-visible:bg-fill-hover"
      href={href}
      onNavigated={onNavigated}
    >
      <span className="ui-glyph center w-8 shrink-0 in-data-active:scale-[1.08]">
        {thumb}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate type-body font-semibold text-ink">
          {title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 type-meta text-ink-muted group-hover:text-ink-body group-focus-visible:text-ink-body group-has-focus-visible:text-ink-body in-data-active:text-ink-body">
          {meta}
        </span>
      </span>
    </DockLink>
  );
}

function ResultThumb({
  fallbackIcon,
  kind,
  path,
}: {
  fallbackIcon: string;
  kind: "poster" | "profile";
  path: string | null;
}) {
  return (
    <MediaCard
      fallbackIcon={fallbackIcon}
      fallbackIconSize={16}
      image={{
        sizes: "32px",
        src: tmdbImageUrl(kind, path, "w185"),
        srcSet: tmdbImageSrcSet(kind, path, RESULT_THUMB_WIDTHS) ?? undefined,
      }}
      radius={RADIUS.thumb}
    />
  );
}

function Highlight({
  query,
  text,
}: {
  query?: string;
  text: string;
}): ReactNode {
  const range = query ? locateMatch(text, query) : null;
  if (!range) return text;
  const [start, end] = range;
  return (
    <>
      <span className="opacity-70">{text.slice(0, start)}</span>
      <mark className="bg-transparent text-inherit">
        {text.slice(start, end)}
      </mark>
      <span className="opacity-70">{text.slice(end)}</span>
    </>
  );
}

export function ListResultRow({
  list,
  onNavigated,
  query,
}: {
  list: ListSearchHit;
  onNavigated?: () => void;
  query?: string;
}) {
  const films = pluralize(list.itemsCount, "film");

  return (
    <ResultRow
      href={listHref(list.owner.username, list.slug)}
      label={`${list.title}, a list by ${list.owner.displayName}`}
      meta={
        <>
          <span className="shrink-0">List</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{films}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">@{list.owner.username}</span>
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <ResultThumb
          fallbackIcon="solar:list-bold"
          kind="poster"
          path={list.posterPath}
        />
      }
      title={<Highlight query={query} text={list.title} />}
    />
  );
}

export function PersonResultRow({
  onNavigated,
  person,
  query,
}: PersonResultRowProps) {
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const role = departmentRole(person.department) ?? "Person";
  const knownFor = person.knownFor?.join(", ");

  return (
    <ResultRow
      href={personHref(person.id)}
      label={`${person.name}, ${role}`}
      meta={
        <>
          <span className="shrink-0">{role}</span>
          {knownFor ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{knownFor}</span>
            </>
          ) : null}
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <ResultThumb
          fallbackIcon="solar:user-bold"
          kind="profile"
          path={photoPath}
        />
      }
      title={<Highlight query={query} text={person.name} />}
    />
  );
}

export function ReviewResultRow({
  onNavigated,
  query,
  review,
}: {
  onNavigated?: () => void;
  query?: string;
  review: ReviewSearchHit;
}) {
  const title = review.year ? `${review.title} (${review.year})` : review.title;

  return (
    <ResultRow
      href={reviewHref(review.tmdbId, review.author.username)}
      label={`${review.author.displayName}'s review of ${title}`}
      meta={
        <>
          {review.rating !== null ? (
            <RatingStars
              className="shrink-0"
              rating={review.rating}
              size={10}
            />
          ) : null}
          <span className="shrink-0">@{review.author.username}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {review.isSpoiler ? (
              "Contains spoilers"
            ) : (
              <Highlight query={query} text={review.excerpt} />
            )}
          </span>
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <ResultThumb
          fallbackIcon="solar:chat-round-bold"
          kind="poster"
          path={review.posterPath}
        />
      }
      title={
        <>
          <Highlight query={query} text={review.title} />
          {review.year ? (
            <span className="font-medium text-ink-muted"> {review.year}</span>
          ) : null}
        </>
      }
    />
  );
}

export function UserResultRow({
  onNavigated,
  query,
  user,
}: {
  onNavigated?: () => void;
  query?: string;
  user: UserSearchHit;
}) {
  const followers = pluralize(user.followersCount, "follower");

  return (
    <ResultRow
      href={accountHref(user.username)}
      label={`${user.displayName}, @${user.username}`}
      meta={
        <>
          <span className="truncate">
            @<Highlight query={query} text={user.username} />
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{followers}</span>
          {user.isPrivate ? (
            <Icon aria-label="Private" icon="solar:lock-bold" size={12} />
          ) : null}
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <Avatar
          className="rounded-full"
          name={user.displayName}
          size={32}
          src={user.avatarUrl}
        />
      }
      title={<Highlight query={query} text={user.displayName} />}
    />
  );
}

export function ResultSheet({
  activeId,
  listRef,
}: {
  activeId: string | null;
  listRef: RefObject<HTMLElement | null>;
}) {
  const sheet = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = sheet.current;
    const list = listRef.current;
    if (!el || !list) return;

    const option = activeId ? document.getElementById(activeId) : null;
    if (!option) {
      el.style.opacity = "0";
      return;
    }

    const place = () => {
      const tile = option.dataset.kind === "tile";
      const inset = tile ? HIGHLIGHT_HALO : 0;
      const { height, width, x, y } = offsetIn(list, option);
      el.dataset.kind = option.dataset.kind;
      el.style.height = `${height + inset * 2}px`;
      el.style.width = `${width + inset * 2}px`;
      el.style.transform = `translate(${x - inset}px, ${y - inset}px)`;
    };

    place();
    el.style.opacity = "1";

    const observer = new ResizeObserver(place);
    observer.observe(list);
    observer.observe(option);
    return () => observer.disconnect();
  }, [activeId, listRef]);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-0 rounded-card bg-grade/15 opacity-0 ring-1 ring-grade/25 ring-inset data-[kind=tile]:ring-grade/50"
      ref={sheet}
    />
  );
}
