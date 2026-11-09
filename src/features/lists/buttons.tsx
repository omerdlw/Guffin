"use client";

import type { JSX } from "react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { useLikeToggle } from "@/features/reviews/controls";
import { createReviewEditorSurfaceEntry } from "@/features/reviews/editor";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { setListLikeAction } from "./actions";
import type { ListCommentTarget } from "./types";

export function ListCommentAction({
  target,
}: {
  target: ListCommentTarget;
}): JSX.Element | null {
  const auth = useAuth();
  const router = useRouter();
  const actionClass = useDockActionClass();
  const { openSurface } = useDockActions();
  const openSignIn = useOpenSignIn();
  if (!auth.isReady) return null;

  const editing = target.content !== null;

  const open = () => {
    if (!auth.isAuthenticated) {
      openSignIn();
      return;
    }
    void openSurface(
      createReviewEditorSurfaceEntry({
        kind: "list",
        listId: target.listId,
        onSaved: () => router.refresh(),
        review: editing ? { content: target.content ?? "" } : null,
        title: target.title,
      }),
    );
  };

  return (
    <Button
      className={actionClass({ className: "w-full backdrop-blur-sm" })}
      onClick={open}
      type="button"
    >
      <Icon
        icon={editing ? "solar:pen-bold" : "solar:chat-round-bold"}
        size={16}
      />
      <span className="truncate">
        {editing ? "Edit Comment" : "Add Comment"}
      </span>
    </Button>
  );
}

export function ListLikeButton({
  liked: initialLiked,
  listId,
  likesCount,
  signedIn,
}: {
  liked: boolean;
  likesCount: number;
  listId: string;
  signedIn: boolean;
}): JSX.Element {
  const actionClass = useDockActionClass();
  const { busy, count, liked, toggle } = useLikeToggle({
    count: likesCount,
    liked: initialLiked,
    name: "ListLikeButton",
    save: (next) => setListLikeAction(listId, next),
    signedIn,
  });

  return (
    <Button
      aria-label={liked ? "Unlike this list" : "Like this list"}
      aria-pressed={liked}
      className={actionClass({
        className:
          "w-auto shrink-0 gap-1.5 px-3.5 backdrop-blur-sm disabled:cursor-wait",
        isActive: liked,
      })}
      disabled={busy}
      onClick={toggle}
      type="button"
    >
      <Icon
        className={liked ? "ui-develop center text-liked" : "ui-develop center"}
        icon={liked ? "solar:heart-bold" : "solar:heart-linear"}
        key={liked ? "liked" : "unliked"}
        size={16}
      />
      <span className="ui-develop tabular-nums" key={count}>
        {count}
      </span>
    </Button>
  );
}
