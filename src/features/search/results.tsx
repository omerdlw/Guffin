"use client";

import { type ReactNode, type RefObject, useLayoutEffect, useRef } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import Link from "next/link";
import { useArtworkPath } from "@/features/artwork/artwork";
import { departmentRole } from "@/features/person/utils";
import { RatingStars } from "@/features/reviews/rating";
import { pluralize } from "@/lib/format";
import { accountHref, listHref, personHref, reviewHref } from "@/lib/project";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/lib/tmdb/shared";
import { POINTS } from "@/motion/constants";
import { step, tween } from "@/motion/utils";
import { useDockLinkClick } from "@/ui/button";
import { Avatar, Icon, MediaCard } from "@/ui/media";
import { RADIUS } from "@/ui/tokens";
import {
  HIGHLIGHT_HALO,
  RESULT_THUMB_WIDTHS,
  STILL_TRANSITION,
} from "./constants";
import type {
  ListSearchHit,
  PersonResultRowProps,
  ReviewSearchHit,
  UserSearchHit,
} from "./types";
import { locateMatch, offsetIn } from "./utils";

const ROLL = tween(step(-1), POINTS.glide);

export function Roll({ value }: { value: number | string }) {
  const reduced = useReducedMotion();

  return (
    <span className="inline-flex">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          key={value}
          transition={ROLL}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
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
  const handleClick = useDockLinkClick(href, onNavigated);

  return (
    <Link
      aria-label={label}
      className="cine-fade group relative z-10 flex h-16 items-center gap-3 rounded-card p-2 pr-4 outline-none focus-visible:bg-fill-hover"
      href={href}
      onClick={handleClick}
      prefetch={false}
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
    </Link>
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

const GLIDE = tween(step(-1.5), POINTS.expo);
const FADE = tween(step(-2), POINTS.expo);

export function ResultSheet({
  activeId,
  listRef,
}: {
  activeId: string | null;
  listRef: RefObject<HTMLElement | null>;
}) {
  const sheet = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = sheet.current;
    const list = listRef.current;
    if (!el || !list) return;

    const option = activeId ? document.getElementById(activeId) : null;
    if (!option) {
      if (placed.current) {
        placed.current = false;
        animate(el, { opacity: 0 }, reduced ? STILL_TRANSITION : FADE);
      }
      return;
    }

    const place = (unseen: boolean) => {
      const tile = option.dataset.kind === "tile";
      const inset = tile ? HIGHLIGHT_HALO : 0;
      const { x, y } = offsetIn(list, option);
      el.dataset.kind = option.dataset.kind;
      animate(
        el,
        {
          height: option.offsetHeight + inset * 2,
          width: option.offsetWidth + inset * 2,
          x: x - inset,
          y: y - inset,
        },
        unseen || reduced ? STILL_TRANSITION : GLIDE,
      );
    };

    place(!placed.current);
    if (!placed.current) {
      placed.current = true;
      animate(el, { opacity: 1 }, reduced ? STILL_TRANSITION : FADE);
    }

    const observer = new ResizeObserver(() => place(false));
    observer.observe(list);
    observer.observe(option);
    return () => observer.disconnect();
  }, [activeId, listRef, reduced]);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-0 rounded-card bg-grade/15 opacity-0 ring-1 ring-grade/25 transition-colors duration-move ease-out-expo ring-inset data-[kind=tile]:ring-grade/50"
      ref={sheet}
    />
  );
}
