"use client";

import { type JSX, useMemo } from "react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { Avatar, Button, type ButtonProps } from "@omerdlw/base-framework/ui";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { DockAction } from "@/design/components/surface";
import { useSurfacePreload } from "@/design/lazy-surface";
import { formatShortDate } from "@/features/account/account";
import { ListCommentAction, ListLikeButton } from "@/features/lists/buttons";
import type { ListFormData } from "@/features/lists/list";
import { listFormSurface } from "@/features/lists/surfaces";
import { PosterStack } from "@/features/profile/blocks";
import { AccountPart } from "@/features/profile/motion";
import type {
  ListCardData,
  ListComment,
  ListDetail,
} from "@/features/profile/profile";
import { useAccountDock } from "@/features/profile/shell";
import { ReviewActions, ReviewBody } from "@/features/reviews/controls";
import { reviewEditorSurface } from "@/features/reviews/surfaces";
import { pluralize } from "@/lib/format";
import { accountHref, listHref } from "@/lib/project";
import type { MediaType } from "@/lib/tmdb/shared";

const LIST_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const toListFormEntry = (
  list: Pick<
    ListCardData,
    | "description"
    | "id"
    | "isPrivate"
    | "isRanked"
    | "itemsCount"
    | "slug"
    | "title"
  >,
): NonNullable<ListFormData["list"]> => ({
  description: list.description,
  id: list.id,
  isPrivate: list.isPrivate,
  isRanked: list.isRanked,
  itemsCount: list.itemsCount,
  slug: list.slug,
  title: list.title,
});

function NewListAction({
  mediaType,
  username,
}: {
  mediaType: MediaType;
  username: string;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const { openSurface } = useDockActions();
  useSurfacePreload(listFormSurface);
  return (
    <DockAction>
      <Button
        className={actionClass({ className: "w-full" })}
        onClick={() =>
          void listFormSurface.open(openSurface, {
            data: { mediaType, username },
          })
        }
        type="button"
      >
        <Icon icon="solar:add-circle-bold" size={16} />
        <span className="truncate">
          {mediaType === "tv" ? "New show list" : "New list"}
        </span>
      </Button>
    </DockAction>
  );
}

export function ListsChrome({
  isOwner,
  mediaType = "movie",
  username,
}: {
  isOwner: boolean;
  mediaType?: MediaType;
  username: string;
}): null {
  const dock = useMemo(
    () =>
      isOwner
        ? {
            action: <NewListAction mediaType={mediaType} username={username} />,
          }
        : null,
    [isOwner, mediaType, username],
  );
  useAccountDock(dock);
  return null;
}

function EditListButton({
  className,
  intent,
  label,
  list,
  shape,
  username,
}: ListFormData &
  Pick<ButtonProps, "className" | "intent" | "shape"> & {
    label?: string;
  }): JSX.Element {
  const { openSurface } = useDockActions();
  useSurfacePreload(listFormSurface);
  const drawn = intent ?? (className ? undefined : "glass");
  return (
    <Button
      aria-label={label ? undefined : `Edit ${list?.title ?? "list"}`}
      className={className}
      icon={drawn ? true : undefined}
      intent={drawn}
      shape={shape}
      size={drawn ? "sm" : undefined}
      onClick={() =>
        void listFormSurface.open(openSurface, { data: { list, username } })
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
          className: "w-10 shrink-0 px-0",
        })}
      />
    );
  }
  return (
    <EditListButton
      {...props}
      className={actionClass({ className: "w-full" })}
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
  const dock = useMemo(
    () => ({
      action: (
        <DockAction>
          {isOwner ? (
            <EditListAction
              list={toListFormEntry(list)}
              username={list.owner.username}
              wide
            />
          ) : (
            <div className="flex w-full items-center gap-2.5">
              <ListLikeButton
                liked={list.liked}
                likesCount={list.likesCount}
                listId={list.id}
                signedIn={signedIn}
              />
              <div className="min-w-0 flex-1">
                <ListCommentAction
                  target={{
                    content: comment,
                    listId: list.id,
                    title: list.title,
                  }}
                />
              </div>
            </div>
          )}
        </DockAction>
      ),
      description:
        list.description.trim().split("\n")[0] ||
        `${pluralize(list.itemsCount, "film")} · by ${list.owner.displayName}`,
      icon: icon ?? "solar:list-bold",
      title: list.title,
    }),
    [comment, icon, isOwner, list, signedIn],
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
  useSurfacePreload(reviewEditorSurface);

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
                <DockLink className="flex shrink-0" href={profile}>
                  <Avatar
                    className="rounded-full"
                    name={comment.author.displayName}
                    size={44}
                    src={comment.author.avatarUrl ?? undefined}
                  />
                </DockLink>
                <div className="flex min-w-0 flex-col gap-1">
                  <DockLink
                    className="truncate type-base font-semibold text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
                    href={profile}
                  >
                    {comment.author.displayName}
                  </DockLink>
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
                      void reviewEditorSurface.open(openSurface, {
                        data: {
                          kind: "list",
                          listId,
                          onSaved: () => router.refresh(),
                          review: { content: comment.content },
                          title: listTitle,
                        },
                      })
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
      <DockLink
        aria-label={list.title}
        className="block w-full shrink-0 ui-fade hover:opacity-80 focus-visible:opacity-80 sm:w-60"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </DockLink>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate type-base leading-6 font-semibold text-ink">
            <DockLink
              className="underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
              href={href}
            >
              {list.title}
            </DockLink>
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
            {pluralize(list.itemsCount, "film")}
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
          className="self-start text-ink-muted ring-edge-hover"
          intent="ghost"
          list={toListFormEntry(list)}
          shape="pill"
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
      <DockLink className="group/list flex flex-col gap-2.5" href={href}>
        <PosterStack
          className="ui-fade group-hover/list:opacity-80 group-focus-visible/list:opacity-80 group-has-focus-visible/list:opacity-80"
          paths={list.previews}
        />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate type-body font-semibold text-ink underline underline-offset-2 decoration-transparent group-hover/list:decoration-current group-focus-visible/list:decoration-current group-has-focus-visible/list:decoration-current">
            {list.title}
          </span>
          <span className="shrink-0 type-meta text-ink-muted tabular-nums">
            {pluralize(list.itemsCount, "film")}
          </span>
        </span>
      </DockLink>
    </AccountPart>
  );
}
