"use client";

import { useMemo } from "react";
import { DockAction } from "@/ui";
import { ListCommentAction } from "@/features/lists";
import { useAccountDock } from "./dock";
import type { ListDetail } from "../browse-types";
import { ListLikeButton } from "@/features/lists";
import { EditListAction } from "./list-owner-actions";
import { counted } from "./section";

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
        `${counted(itemsCount, "film")} · by ${owner.displayName}`,
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
