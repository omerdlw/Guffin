"use client";

import { type JSX, useState, useTransition } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/notification";
import { Button } from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { useConfirmedAction } from "@/design/components/confirm";
import { Icon } from "@/design/components/icon";
import { cn } from "@/design/ui";
import { useOpenSignIn } from "@/features/auth/sign-in-surface";
import { deleteReviewAction, setReviewLikeAction } from "./actions";
import { REVIEW_EVENTS } from "./review";

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
  revealShape,
}: {
  content: string;
  isSpoiler: boolean;
  revealShape?: "card" | "pill";
}): JSX.Element {
  const [revealed, setRevealed] = useState(false);

  if (isSpoiler && !revealed) {
    return (
      <Button
        className={"w-fit font-semibold"}
        intent="neutral"
        shape={revealShape}
        size="sm"
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
  const { busy, confirmThen } = useConfirmedAction({
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
  const remove = () =>
    void confirmThen(
      {
        description: "Your review is removed for good",
        title: "Delete this review?",
      },
      () => deleteReviewAction(id),
    );

  const quiet = "text-ink-muted";

  return (
    <div className="flex items-center gap-1.5">
      <Button
        aria-pressed={liked}
        className={cn("px-2 font-semibold", liked ? "text-grade" : quiet)}
        intent="ghost"
        size="sm"
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
          className={quiet}
          icon
          intent="ghost"
          size="sm"
          disabled={busy || likes.busy}
          onClick={onEdit}
        >
          <Icon icon="solar:pen-bold" size={14} />
        </Button>
      ) : null}
      {isOwner ? (
        <Button
          aria-label="Delete this review"
          className={quiet}
          icon
          intent="ghost"
          size="sm"
          disabled={busy || likes.busy}
          loading={busy}
          onClick={remove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={14} />
        </Button>
      ) : null}
    </div>
  );
}
