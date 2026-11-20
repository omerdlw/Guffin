"use client";

import { type JSX, useState, useTransition } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { TONES } from "@/design/foundations/tones";
import { useSurfacePreload } from "@/design/lazy-surface";
import { cn } from "@/design/ui";
import { formatShortDate } from "@/features/account/account";
import { listFormSurface } from "@/features/lists/surfaces";
import { PosterStack } from "@/features/lists/poster-stack";
import { pluralize } from "@/lib/format";
import { listHref } from "@/lib/project";
import { loadListsPage } from "./actions";
import type { ListSort, ListsPage, ProfileList } from "./lists";

const STRONG =
  "underline decoration-transparent underline-offset-2 hover:decoration-current";

const PILL =
  "center h-control-sm gap-fib-2 rounded-full px-fib-4 type-control font-medium";

function NewListCard({ username }: { username: string }): JSX.Element {
  const { openSurface } = useDockActions();
  useSurfacePreload(listFormSurface);
  return (
    <li className="flex min-w-0 flex-col gap-fib-3" data-part="list">
      <button
        className="group/new relative block w-full cursor-pointer text-left"
        onClick={() =>
          void listFormSurface.open(openSurface, {
            data: { username },
          })
        }
        type="button"
      >
        <PosterStack
          className="ui-fade group-hover/new:opacity-80"
          paths={[]}
        />
        <span className="absolute inset-0 center text-ink-muted group-hover/new:text-ink">
          <Icon icon="solar:add-circle-bold" size={28} />
        </span>
      </button>
      <div className="flex min-w-0 flex-col gap-fib-1">
        <span className="type-base font-semibold text-ink">New list</span>
        <span className="type-meta text-ink-muted">
          Gather films under one title
        </span>
      </div>
    </li>
  );
}

function ListCard({
  list,
  username,
}: {
  list: ProfileList;
  username: string;
}): JSX.Element {
  const href = listHref(username, list.slug);
  return (
    <li className="flex min-w-0 flex-col gap-fib-3" data-part="list">
      <DockLink
        aria-label={list.title}
        className="block ui-fade hover:opacity-80"
        data-cursor-fit="snug"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </DockLink>
      <div className="flex min-w-0 flex-col gap-fib-1">
        <h3 className="flex min-w-0 items-center gap-fib-2">
          <DockLink
            className={cn(STRONG, "truncate type-base font-semibold text-ink")}
            href={href}
          >
            {list.title}
          </DockLink>
          {list.isPrivate ? (
            <Icon
              aria-label="Private"
              className="shrink-0 text-ink-muted"
              icon="solar:lock-bold"
              size={13}
            />
          ) : null}
        </h3>
        <p className="flex flex-wrap items-center gap-x-fib-3 gap-y-1 type-meta text-ink-muted tabular-nums">
          <span>
            {pluralize(list.itemsCount, "film")}
            {list.isRanked ? " · Ranked" : ""}
          </span>
          {list.likesCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:heart-bold" size={12} />
              {list.likesCount}
            </span>
          ) : null}
          {list.reviewsCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:chat-round-bold" size={12} />
              {list.reviewsCount}
            </span>
          ) : null}
          <time dateTime={list.updatedAt}>
            {formatShortDate(list.updatedAt)}
          </time>
        </p>
        {list.description ? (
          <p className="mt-fib-1 line-clamp-2 type-body text-pretty text-ink-body">
            {list.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function ListsShelf({
  empty,
  isOwner,
  page,
  query,
  sort,
  username,
}: {
  empty: string | null;
  isOwner: boolean;
  page: ListsPage;
  query: string;
  sort: ListSort;
  username: string;
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

  const more = () => {
    if (next === null) return;
    startTransition(async () => {
      const result = await loadListsPage({
        offset: next,
        query,
        sort,
        username,
      });
      setItems((current) => [...current, ...result.items]);
      setNext(result.next);
    });
  };

  return (
    <div className="flex flex-col gap-fib-5">
      <ul className="grid grid-cols-1 gap-x-fib-5 gap-y-fib-6 sm:grid-cols-2 lg:grid-cols-3">
        {isOwner && !query ? <NewListCard username={username} /> : null}
        {items.map((list) => (
          <ListCard key={list.id} list={list} username={username} />
        ))}
      </ul>
      {empty && items.length === 0 ? (
        <p className="py-fib-5 text-center type-body text-ink-muted">{empty}</p>
      ) : null}
      {next !== null ? (
        <button
          aria-busy={pending || undefined}
          className={cn(TONES.outline, PILL, "self-center disabled:opacity-50")}
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
