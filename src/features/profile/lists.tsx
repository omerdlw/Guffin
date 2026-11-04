"use client";

import { type JSX, useMemo } from "react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useRouter } from "next/navigation";
import { formatShortDate } from "@/features/account/utils";
import { ListCommentAction, ListLikeButton } from "@/features/lists/buttons";
import { createListFormSurfaceEntry } from "@/features/lists/form";
import type { ListFormData } from "@/features/lists/types";
import {
  createReviewEditorSurfaceEntry,
  ReviewActions,
  ReviewBody,
} from "@/features/reviews/controls";
import { accountHref, listHref } from "@/lib/project";
import { AccountLink, Button, DockAction } from "@/ui/button";
import { Avatar, Icon } from "@/ui/media";
import { PosterStack } from "./blocks";
import { LIST_DATE_FORMAT } from "./constants";
import { AccountPart } from "./motion";
import { useAccountDock } from "./shell";
import type { ListCardData, ListComment, ListDetail } from "./types";
import { countLabel } from "./utils";

function NewListAction({ username }: { username: string }): JSX.Element {
  const actionClass = useDockActionClass();
  const { openSurface } = useDockActions();
  return (
    <DockAction>
      <Button
        className={actionClass({ className: "w-full backdrop-blur-sm" })}
        onClick={() =>
          void openSurface(createListFormSurfaceEntry({ username }))
        }
        type="button"
      >
        <Icon icon="solar:add-circle-bold" size={16} />
        <span className="truncate">New list</span>
      </Button>
    </DockAction>
  );
}

export function ListsChrome({
  isOwner,
  username,
}: {
  isOwner: boolean;
  username: string;
}): null {
  const dock = useMemo(
    () => (isOwner ? { action: <NewListAction username={username} /> } : null),
    [isOwner, username],
  );
  useAccountDock(dock);
  return null;
}

function EditListButton({
  className,
  label,
  list,
  username,
}: ListFormData & { className?: string; label?: string }): JSX.Element {
  const { openSurface } = useDockActions();
  return (
    <Button
      aria-label={label ? undefined : `Edit ${list?.title ?? "list"}`}
      className={
        className ??
        "center size-8 cursor-pointer bg-black/60 text-ink-body ring-1 ring-edge-hover backdrop-blur-sm ring-inset hover:bg-black/70 focus-visible:bg-black/70 hover:text-ink focus-visible:text-ink"
      }
      onClick={() =>
        void openSurface(createListFormSurfaceEntry({ list, username }))
      }
      type="button"
    >
      <Icon icon="solar:pen-bold" size={label ? 16 : 15} />
      {label ? <span className="truncate">{label}</span> : null}
    </Button>
  );
}

function EditListAction({
  wide = false,
  ...props
}: ListFormData & { wide?: boolean }): JSX.Element {
  const actionClass = useDockActionClass();
  if (!wide) {
    return (
      <EditListButton
        {...props}
        className={actionClass({
          className: "w-10 shrink-0 px-0 backdrop-blur-sm",
        })}
      />
    );
  }
  return (
    <EditListButton
      {...props}
      className={actionClass({ className: "w-full backdrop-blur-sm" })}
      label="Edit list"
    />
  );
}

export function ListChrome({
  comment,
  icon,
  isOwner,
  list,
  signedIn,
}: {
  comment: string | null;
  icon: string | null;
  isOwner: boolean;
  list: ListDetail;
  signedIn: boolean;
}): null {
  const {
    description,
    id,
    isPrivate,
    isRanked,
    itemsCount,
    liked,
    likesCount,
    owner,
    slug,
    title,
  } = list;

  const dock = useMemo(
    () => ({
      action: (
        <DockAction>
          {isOwner ? (
            <EditListAction
              list={{
                description,
                id,
                isPrivate,
                isRanked,
                itemsCount,
                slug,
                title,
              }}
              username={owner.username}
              wide
            />
          ) : (
            <div className="flex w-full items-center gap-2.5">
              <ListLikeButton
                liked={liked}
                likesCount={likesCount}
                listId={id}
                signedIn={signedIn}
              />
              <div className="min-w-0 flex-1">
                <ListCommentAction
                  target={{ content: comment, listId: id, title }}
                />
              </div>
            </div>
          )}
        </DockAction>
      ),
      description:
        description.trim().split("\n")[0] ||
        `${countLabel(itemsCount, "film")} · by ${owner.displayName}`,
      icon: icon ?? "solar:list-bold",
      title,
    }),
    [
      comment,
      description,
      icon,
      id,
      isOwner,
      isPrivate,
      isRanked,
      itemsCount,
      liked,
      likesCount,
      owner.displayName,
      owner.username,
      signedIn,
      slug,
      title,
    ],
  );
  useAccountDock(dock);
  return null;
}

export function ListComments({
  comments,
  listId,
  listTitle,
  viewerId,
}: {
  comments: readonly ListComment[];
  listId: string;
  listTitle: string;
  viewerId: string | null;
}): JSX.Element {
  const router = useRouter();
  const { openSurface } = useDockActions();

  if (comments.length === 0) {
    return (
      <p className="py-10 text-center type-body text-ink-muted">
        No comments yet
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-rule">
      {comments.map((comment) => {
        const profile = accountHref(comment.author.username);
        return (
          <li className="flex py-6 first:pt-0 last:pb-0" key={comment.id}>
            <article className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-3.5">
                <AccountLink className="flex shrink-0" href={profile}>
                  <Avatar
                    className="rounded-full"
                    name={comment.author.displayName}
                    size={44}
                    src={comment.author.avatarUrl ?? undefined}
                  />
                </AccountLink>
                <div className="flex min-w-0 flex-col gap-1">
                  <AccountLink
                    className="truncate type-base font-semibold text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
                    href={profile}
                  >
                    {comment.author.displayName}
                  </AccountLink>
                  <time
                    className="type-meta font-semibold text-ink-muted"
                    dateTime={comment.createdAt}
                  >
                    {LIST_DATE_FORMAT.format(new Date(comment.createdAt))}
                  </time>
                </div>
                <div className="-mr-2 ml-auto shrink-0">
                  <ReviewActions
                    id={comment.id}
                    isOwner={comment.author.id === viewerId}
                    liked={comment.liked}
                    likesCount={comment.likesCount}
                    onEdit={() =>
                      void openSurface(
                        createReviewEditorSurfaceEntry({
                          kind: "list",
                          listId,
                          onSaved: () => router.refresh(),
                          review: { content: comment.content },
                          title: listTitle,
                        }),
                      )
                    }
                    signedIn={viewerId !== null}
                  />
                </div>
              </div>

              <div className="[&_p]:type-copy [&_p]:leading-7 [&_p]:text-ink-body">
                <ReviewBody content={comment.content} isSpoiler={false} />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function ListRow({
  list,
  ownerEdit,
  username,
}: {
  list: ListCardData;
  ownerEdit?: boolean;
  username: string;
}): JSX.Element {
  const href = listHref(username, list.slug);

  return (
    <li className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
      <AccountLink
        aria-label={list.title}
        className="block w-full shrink-0 ui-fade hover:opacity-80 focus-visible:opacity-80 sm:w-60"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </AccountLink>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate type-base leading-6 font-semibold text-ink">
            <AccountLink
              className="underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
              href={href}
            >
              {list.title}
            </AccountLink>
          </h3>
          {list.isPrivate ? (
            <Icon
              aria-label="Private"
              className="shrink-0 text-ink-muted"
              icon="solar:lock-bold"
              size={13}
            />
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 type-meta text-ink-muted tabular-nums">
          <span>
            {countLabel(list.itemsCount, "film")}
            {list.isRanked ? " · Ranked" : ""}
          </span>
          <span>Updated {formatShortDate(list.updatedAt)}</span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:heart-linear" size={13} />
            {list.likesCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:chat-round-linear" size={13} />
            {list.reviewsCount}
          </span>
        </p>
        {list.description ? (
          <p className="mt-1 line-clamp-2 max-w-2xl type-body leading-6 text-ink-body">
            {list.description}
          </p>
        ) : null}
      </div>

      {ownerEdit ? (
        <EditListButton
          className="center size-8 shrink-0 cursor-pointer self-start rounded-full text-ink-muted ring-1 ring-edge-hover ring-inset hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink"
          list={{
            description: list.description,
            id: list.id,
            isPrivate: list.isPrivate,
            isRanked: list.isRanked,
            itemsCount: list.itemsCount,
            slug: list.slug,
            title: list.title,
          }}
          username={username}
        />
      ) : null}
    </li>
  );
}

export function ListRows({
  lists,
  ownerEdit,
  username,
}: {
  lists: readonly ListCardData[];
  ownerEdit?: boolean;
  username: string;
}): JSX.Element {
  return (
    <ul className="flex flex-col divide-y divide-rule">
      {lists.map((list) => (
        <ListRow
          key={list.id}
          list={list}
          ownerEdit={ownerEdit}
          username={username}
        />
      ))}
    </ul>
  );
}

export function ListTeaser({
  index = 0,
  list,
  username,
}: {
  index?: number;
  list: ListCardData;
  username: string;
}): JSX.Element {
  const href = listHref(username, list.slug);
  return (
    <AccountPart index={index} name="row">
      <AccountLink className="group/list flex flex-col gap-2.5" href={href}>
        <PosterStack
          className="ui-fade group-hover/list:opacity-80 group-focus-visible/list:opacity-80 group-has-focus-visible/list:opacity-80"
          paths={list.previews}
        />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate type-body font-semibold text-ink underline underline-offset-2 decoration-transparent group-hover/list:decoration-current group-focus-visible/list:decoration-current group-has-focus-visible/list:decoration-current">
            {list.title}
          </span>
          <span className="shrink-0 type-meta text-ink-muted tabular-nums">
            {countLabel(list.itemsCount, "film")}
          </span>
        </span>
      </AccountLink>
    </AccountPart>
  );
}
