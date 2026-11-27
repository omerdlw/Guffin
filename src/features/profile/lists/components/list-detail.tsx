"use client";

import { type JSX, useMemo, useState, useTransition } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/dock";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import { Avatar, Button } from "@omerdlw/base-framework/ui";
import { useRouter } from "next/navigation";
import { ActionIcon, ActionLabel } from "@/design/components/action-content";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { MediaCard } from "@/design/components/media-card";
import { DockAction } from "@/design/surface/surface";
import { RADIUS } from "@/design/foundations/geometry";
import { TONES } from "@/design/foundations/tones";
import { useSurfacePreload } from "@/design/surface/lazy";
import { cn } from "@/design/ui";
import { formatShortDate } from "@/features/account/model";
import {
  ListCommentAction,
  ListLikeButton,
} from "@/features/lists/components/list-buttons";
import { listFormSurface } from "@/features/lists/surfaces";
import {
  ReviewActions,
  ReviewBody,
} from "@/features/reviews/components/review-controls";
import { reviewEditorSurface } from "@/features/reviews/surfaces";
import { pluralize } from "@/shared/format";
import { accountHref, listHref, movieHref } from "@/shared/site";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { loadListEntries } from "../actions";
import type {
  EntryFilters,
  ListComment,
  ListDetail,
  ListEntriesPage,
  ListEntry,
} from "../model";

const STRONG =
  "font-medium text-ink underline decoration-transparent underline-offset-2 hover:decoration-current";

function ListAction({
  comment,
  isOwner,
  list,
  signedIn,
  username,
}: {
  comment: string | null;
  isOwner: boolean;
  list: ListDetail;
  signedIn: boolean;
  username: string;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const { openSurface } = useDockActions();
  useSurfacePreload(listFormSurface);

  if (isOwner) {
    return (
      <DockAction>
        <Button
          className={actionClass({ className: "w-full" })}
          onClick={() =>
            void listFormSurface.open(openSurface, {
              data: {
                list: {
                  description: list.description,
                  id: list.id,
                  isPrivate: list.isPrivate,
                  isRanked: list.isRanked,
                  itemsCount: list.itemsCount,
                  slug: list.slug,
                  title: list.title,
                },
                username,
              },
            })
          }
          type="button"
        >
          <ActionIcon icon="solar:pen-bold" />
          <ActionLabel>Edit list</ActionLabel>
        </Button>
      </DockAction>
    );
  }

  return (
    <DockAction>
      <div className="flex w-full items-center gap-fib-2">
        <ListLikeButton
          liked={list.liked}
          likesCount={list.likesCount}
          listId={list.id}
          signedIn={signedIn}
        />
        <div className="min-w-0 flex-1">
          <ListCommentAction
            target={{ content: comment, listId: list.id, title: list.title }}
          />
        </div>
      </div>
    </DockAction>
  );
}

export function ListDock({
  comment,
  isOwner,
  list,
  signedIn,
  username,
}: {
  comment: string | null;
  isOwner: boolean;
  list: ListDetail;
  signedIn: boolean;
  username: string;
}): null {
  const config = useMemo(
    () => ({
      action: (
        <ListAction
          comment={comment}
          isOwner={isOwner}
          list={list}
          signedIn={signedIn}
          username={username}
        />
      ),
      description: [
        pluralize(list.itemsCount, "film"),
        list.isRanked ? "Ranked" : null,
        `Updated ${formatShortDate(list.updatedAt)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      icon:
        tmdbImageUrl("poster", list.posterPath, "w185") ?? "solar:list-bold",
      path: listHref(username, list.slug),
      title: list.title,
    }),
    [comment, isOwner, list, signedIn, username],
  );
  useDockRegistration(config, {
    priority: 270,
    source: REGISTRY_SOURCES.DYNAMIC,
  });
  return null;
}

export function ListHeader({
  list,
  username,
}: {
  list: ListDetail;
  username: string;
}): JSX.Element {
  return (
    <header className="flex flex-col gap-fib-4" data-part="header">
      <DockLink
        className="inline-flex w-fit items-center gap-fib-1 type-meta font-medium text-ink-muted hover:text-ink"
        href={`${accountHref(username)}/lists`}
      >
        <Icon icon="solar:alt-arrow-left-linear" size={13} />
        All lists
      </DockLink>
      <div className="flex min-w-0 flex-col gap-fib-3">
        <h2 className="flex min-w-0 items-center gap-fib-2 type-heading font-semibold break-words text-ink">
          {list.title}
          {list.isPrivate ? (
            <Icon
              aria-label="Private list"
              className="shrink-0 text-ink-muted"
              icon="solar:lock-bold"
              size={16}
            />
          ) : null}
        </h2>
        {list.description ? (
          <p className="max-w-[65ch] type-body leading-6 whitespace-pre-line text-pretty text-ink-body">
            {list.description}
          </p>
        ) : null}
      </div>
    </header>
  );
}

function EntryTile({
  entry,
  list,
}: {
  entry: ListEntry;
  list: ListDetail;
}): JSX.Element {
  const label = entry.year ? `${entry.title} (${entry.year})` : entry.title;
  return (
    <li className="flex min-w-0 flex-col gap-fib-2" data-part="tile">
      <MediaCard
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={20}
        href={movieHref(entry.tmdbId)}
        image={{
          sizes: "(min-width: 896px) 170px, 30vw",
          src: tmdbImageUrl("poster", entry.posterPath, "w342"),
          srcSet:
            tmdbImageSrcSet("poster", entry.posterPath, ["w185", "w342"]) ??
            undefined,
        }}
        label={label}
        radius={RADIUS.card}
        tooltip={label}
      />
      {list.isRanked ? (
        <span className="text-center type-meta font-semibold text-ink-muted tabular-nums">
          {entry.place}
        </span>
      ) : null}
    </li>
  );
}

export function ListEntries({
  empty,
  filters,
  list,
  page,
}: {
  empty: string;
  filters: EntryFilters;
  list: ListDetail;
  page: ListEntriesPage;
}): JSX.Element {
  const [served, setServed] = useState(page);
  const [items, setItems] = useState(page.items);
  const [next, setNext] = useState(page.next);
  const [pending, startTransition] = useTransition();
  if (page !== served) {
    setServed(page);
    setItems(page.items);
    setNext(page.next);
  }

  if (items.length === 0) {
    return (
      <p className="py-fib-6 text-center type-body text-ink-muted">{empty}</p>
    );
  }

  const more = () => {
    if (next === null) return;
    startTransition(async () => {
      const result = await loadListEntries({
        filters,
        listId: list.id,
        offset: next,
      });
      setItems((current) => [...current, ...result.items]);
      setNext(result.next);
    });
  };

  return (
    <div className="flex flex-col gap-fib-5">
      <ol className="grid grid-cols-3 gap-fib-3 sm:grid-cols-4 lg:grid-cols-5">
        {items.map((entry) => (
          <EntryTile entry={entry} key={entry.tmdbId} list={list} />
        ))}
      </ol>
      {next !== null ? (
        <button
          aria-busy={pending || undefined}
          className={cn(
            TONES.outline,
            "self-center rounded-full px-fib-4 h-control-sm type-control font-medium disabled:opacity-50",
          )}
          disabled={pending}
          onClick={more}
          type="button"
        >
          {pending ? "Loading…" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export function ListComments({
  comments,
  list,
  total,
  viewerId,
}: {
  comments: readonly ListComment[];
  list: ListDetail;
  total: number;
  viewerId: string | null;
}): JSX.Element {
  const router = useRouter();
  const { openSurface } = useDockActions();
  useSurfacePreload(reviewEditorSurface);

  return (
    <section className="flex flex-col gap-fib-4" data-section="comments">
      <h3
        className="flex items-baseline gap-fib-2 type-base font-semibold text-ink"
        data-part="heading"
      >
        Comments
        <span className="type-meta font-normal text-ink-muted tabular-nums">
          {total}
        </span>
      </h3>
      {comments.length === 0 ? (
        <p className="py-fib-5 text-center type-body text-ink-muted">
          No comments yet
        </p>
      ) : (
        <ul className="flex flex-col">
          {comments.map((comment) => {
            const profile = accountHref(comment.author.username);
            return (
              <li
                className="flex gap-fib-3 border-t border-rule py-fib-4 first:border-t-0 first:pt-0"
                data-part="row"
                key={comment.id}
              >
                <DockLink className="flex shrink-0 self-start" href={profile}>
                  <Avatar
                    className="rounded-full"
                    name={comment.author.displayName}
                    size={36}
                    src={comment.author.avatarUrl ?? undefined}
                  />
                </DockLink>
                <article className="flex min-w-0 flex-1 flex-col gap-fib-2">
                  <header className="flex min-w-0 flex-wrap items-baseline gap-x-fib-2">
                    <DockLink
                      className={cn(STRONG, "type-body")}
                      href={profile}
                    >
                      {comment.author.displayName}
                    </DockLink>
                    <time
                      className="type-meta text-ink-faint tabular-nums"
                      dateTime={comment.createdAt}
                    >
                      {formatShortDate(comment.createdAt)}
                    </time>
                  </header>
                  <div className="max-w-[65ch] [&_p]:type-body [&_p]:leading-6 [&_p]:text-ink-body">
                    <ReviewBody content={comment.content} isSpoiler={false} />
                  </div>
                  <footer className="-mb-2 -ml-2">
                    <ReviewActions
                      id={comment.id}
                      isOwner={comment.author.id === viewerId}
                      liked={comment.liked}
                      likesCount={comment.likesCount}
                      onEdit={() =>
                        void reviewEditorSurface.open(openSurface, {
                          data: {
                            kind: "list",
                            listId: list.id,
                            onSaved: () => router.refresh(),
                            review: { content: comment.content },
                            title: list.title,
                          },
                        })
                      }
                      quietZero
                      signedIn={viewerId !== null}
                    />
                  </footer>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
