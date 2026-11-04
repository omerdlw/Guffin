"use client";

import { type JSX, useState, useTransition } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { Button, useConfirmedAction } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Icon } from "@/ui/media";
import { deleteReviewAction, setReviewLikeAction } from "./actions";
import { REVIEW_EVENTS } from "./constants";

export function useLikeToggle({
  count: initialCount,
  liked: initialLiked,
  name,
  save,
  signedIn,
}: {
  count: number;
  liked: boolean;
  name: string;
  save: (liked: boolean) => Promise<{ error?: string; success: boolean }>;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [busy, startTransition] = useTransition();
  const [seen, setSeen] = useState({
    count: initialCount,
    liked: initialLiked,
  });
  const [{ count, liked }, setState] = useState(seen);
  if (seen.count !== initialCount || seen.liked !== initialLiked) {
    const props = { count: initialCount, liked: initialLiked };
    setSeen(props);
    setState(props);
  }

  const toggle = () => {
    if (!signedIn) {
      openSignIn();
      return;
    }
    const previous = { count, liked };
    const next = !liked;
    setState({ count: Math.max(0, count + (next ? 1 : -1)), liked: next });
    startTransition(async () => {
      try {
        const result = await save(next);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        setState(previous);
        report(name, error);
        toast(toUserMessage(error, { fallback: "Could not update your like" }));
      }
    });
  };

  return { busy, count, liked, toggle };
}

export function ReviewBody({
  content,
  isSpoiler,
  revealClassName,
}: {
  content: string;
  isSpoiler: boolean;
  revealClassName?: string;
}): JSX.Element {
  const [revealed, setRevealed] = useState(false);

  if (isSpoiler && !revealed) {
    return (
      <Button
        className={cn(
          "inline-flex w-fit cursor-pointer items-center gap-1.5 bg-fill px-3 py-2 type-meta font-semibold text-ink-body ring-1 ring-edge ring-inset hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink",
          revealClassName,
        )}
        onClick={() => setRevealed(true)}
      >
        <Icon icon="solar:eye-closed-linear" size={14} />
        Contains spoilers, show anyway
      </Button>
    );
  }

  return (
    <p className="type-body leading-6 whitespace-pre-line text-ink-body">
      {content}
    </p>
  );
}

export function ReviewActions({
  id,
  isOwner,
  liked: initialLiked,
  likesCount,
  onEdit,
  signedIn,
}: {
  id: string;
  isOwner: boolean;
  onEdit?: () => void;
  liked: boolean;
  likesCount: number;
  signedIn: boolean;
}): JSX.Element {
  const router = useRouter();
  const { busy, confirming, confirmThen } = useConfirmedAction({
    fallback: "Could not delete this review",
    name: "ReviewActions delete",
    onSuccess: () => {
      router.refresh();
      globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "delete" });
    },
  });
  const likes = useLikeToggle({
    count: likesCount,
    liked: initialLiked,
    name: "ReviewActions like",
    save: async (next) => {
      const result = await setReviewLikeAction(id, next);
      if (result.success) {
        globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "like" });
      }
      return result;
    },
    signedIn,
  });
  const { count, liked } = likes;
  const remove = () => confirmThen(() => deleteReviewAction(id));

  const like = cn(
    "inline-flex h-8 cursor-pointer items-center gap-1.5 px-2 type-meta font-semibold disabled:cursor-wait",
    liked
      ? "text-grade"
      : "text-ink-muted hover:text-ink focus-visible:text-ink",
  );
  const round =
    "center size-8 cursor-pointer text-ink-muted hover:text-ink focus-visible:text-ink";
  const trash = confirming
    ? "center size-8 cursor-pointer text-danger disabled:cursor-wait"
    : "center size-8 cursor-pointer text-ink-muted hover:text-ink focus-visible:text-ink disabled:cursor-wait";

  return (
    <div className="flex items-center gap-1.5">
      <Button
        aria-pressed={liked}
        className={like}
        disabled={busy || likes.busy}
        onClick={likes.toggle}
      >
        <Icon
          icon={liked ? "solar:heart-bold" : "solar:heart-linear"}
          size={14}
        />
        {count}
      </Button>
      {isOwner && onEdit ? (
        <Button
          aria-label="Edit this review"
          className={round}
          disabled={busy || likes.busy}
          onClick={onEdit}
        >
          <Icon icon="solar:pen-bold" size={14} />
        </Button>
      ) : null}
      {isOwner ? (
        <Button
          aria-label={
            confirming ? "Confirm deleting this review" : "Delete this review"
          }
          className={trash}
          disabled={busy || likes.busy}
          loading={busy && confirming}
          onClick={remove}
        >
          <Icon
            icon={
              confirming
                ? "solar:check-read-linear"
                : "solar:trash-bin-trash-bold"
            }
            size={14}
          />
        </Button>
      ) : null}
    </div>
  );
}
