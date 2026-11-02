"use client";

import { useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@/ui/cn";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { Button, Icon, useConfirmStep } from "@/ui";
import { globalEvents } from "@omerdlw/base-framework/events";
import { REVIEW_EVENTS } from "../constants";
import { useLikeToggle } from "../hooks";
import { deleteReviewAction, setReviewLikeAction } from "../server/actions";

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
  const toast = useToast();
  const [confirming, setConfirming] = useConfirmStep();
  const [busy, startTransition] = useTransition();
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

  const remove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      try {
        const result = await deleteReviewAction(id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
        globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "delete" });
      } catch (error) {
        report("ReviewActions delete", error);
        toast(
          toUserMessage(error, { fallback: "Could not delete this review" }),
        );
      }
      setConfirming(false);
    });
  };

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
