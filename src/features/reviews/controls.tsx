"use client";

import {
  type FormEvent,
  type JSX,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  type SurfaceEntry,
  useDockActionClass,
  useDockActions,
  useDockTheme,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/provider";
import { createSignInSurfaceEntry } from "@/features/auth/sign-in";
import { Button, DockAction, useConfirmStep } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Textarea } from "@/ui/form";
import { Icon } from "@/ui/media";
import { SurfacePart, SurfaceStage } from "@/ui/surface";
import {
  deleteReviewAction,
  getOwnMovieReviewAction,
  saveListCommentAction,
  saveMovieReviewAction,
  setReviewLikeAction,
} from "./actions";
import {
  REVIEW_EDITOR_SURFACE_WIDTH,
  REVIEW_EVENTS,
  REVIEW_MAX_LENGTH,
} from "./constants";
import { RatingSelector } from "./rating";
import type { ReviewEditorData, ReviewInput } from "./types";
import { getReviewValidationError, primaryLabel } from "./utils";
import {
  SURFACE_FIELD,
  SURFACE_PRIMARY,
  SURFACE_STACK,
  surfaceButton,
} from "@/ui/tokens";

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
  const { openSurface } = useDockActions();
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
      void openSurface(
        createSignInSurfaceEntry({
          next: window.location.pathname + window.location.search,
        }),
      );
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

export function createReviewEditorSurfaceEntry(
  data: ReviewEditorData,
): SurfaceEntry {
  const editing = data.review !== null;
  const noun = data.kind === "list" ? "Comment" : "Review";
  return {
    component: ReviewEditorSurface,
    description: data.title,
    icon: "solar:pen-new-square-bold",
    props: { data },
    title: `${editing ? "Edit" : "Add"} ${noun}`,
    width: REVIEW_EDITOR_SURFACE_WIDTH,
  };
}

function ReviewEditorSurface({
  data,
}: {
  data: ReviewEditorData;
}): JSX.Element {
  const toast = useToast();
  const { closeSurface } = useDockActions();
  const isList = data.kind === "list";
  const editing = data.review !== null;

  const [content, setContent] = useState(data.review?.content ?? "");
  const [rating, setRating] = useState<number | null>(
    data.kind === "movie" ? (data.review?.rating ?? null) : null,
  );
  const [isSpoiler, setIsSpoiler] = useState(
    data.kind === "movie" ? Boolean(data.review?.isSpoiler) : false,
  );
  const [saving, setSaving] = useState(false);

  const text = content.trim();
  const problem = getReviewValidationError({
    allowRating: !isList,
    content,
    rating,
    requireText: isList,
    textLabel: isList ? "comment" : "review",
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (problem) {
      toast(problem);
      return;
    }

    setSaving(true);
    try {
      if (data.kind === "list") {
        const result = await saveListCommentAction(data.listId, text);
        if (!result.success) throw new Error(result.error);
        data.onSaved?.();
      } else {
        const next: ReviewInput = {
          content: text,
          isSpoiler: text ? isSpoiler : false,
          rating,
        };
        const result = await saveMovieReviewAction(data.movieId, next);
        if (!result.success) throw new Error(result.error);
        data.onSaved?.(next);
      }
      globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "save" });
      closeSurface?.();
    } catch (error) {
      report("ReviewEditorSurface save", error);
      toast(toUserMessage(error, { fallback: "Could not save" }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SurfaceStage>
      <form onSubmit={submit}>
        <div className={SURFACE_STACK}>
          {!isList ? (
            <SurfacePart className="flex w-full justify-center" name="item">
              <RatingSelector
                disabled={saving}
                onChange={setRating}
                value={rating}
              />
            </SurfacePart>
          ) : null}

          <SurfacePart className="relative w-full" name="item">
            <Textarea
              aria-label={isList ? "Comment" : "Review"}
              className={`${SURFACE_FIELD} min-h-[130px] w-full p-4 pb-9 type-body`}
              disabled={saving}
              maxHeight={260}
              maxLength={REVIEW_MAX_LENGTH}
              minHeight={130}
              onChange={(event) => {
                setContent(event.target.value);
                if (!event.target.value.trim()) setIsSpoiler(false);
              }}
              placeholder={
                isList
                  ? `Share your thoughts on ${data.title}`
                  : `Add your thoughts about ${data.title} (optional)`
              }
              value={content}
            />
            <div className="pointer-events-none absolute right-3.5 bottom-2.5 type-meta font-medium text-ink-muted select-none">
              {problem && (text || rating !== null) ? (
                <span className="font-semibold text-danger">{problem}</span>
              ) : text ? (
                <span>
                  {text.length} / {REVIEW_MAX_LENGTH}
                </span>
              ) : null}
            </div>
          </SurfacePart>

          <div className="flex w-full gap-2.5">
            {!isList ? (
              <SurfacePart className="min-w-0 flex-1" name="item">
                <Button
                  aria-checked={isSpoiler}
                  className={`${surfaceButton(Boolean(isSpoiler && text))} w-full`}
                  disabled={!text || saving}
                  onClick={() => setIsSpoiler((current) => !current)}
                  role="switch"
                >
                  <Icon icon="solar:eye-closed-linear" size={15} />
                  {isSpoiler && text ? "Contains Spoilers" : "Mark as Spoiler"}
                </Button>
              </SurfacePart>
            ) : null}
            <SurfacePart className="min-w-0 flex-1" name="item">
              <Button
                className={`${SURFACE_PRIMARY} w-full`}
                disabled={Boolean(problem)}
                loading={saving}
                type="submit"
              >
                {primaryLabel({
                  editing,
                  isList,
                  ratingOnly: rating !== null && !text,
                })}
              </Button>
            </SurfacePart>
          </div>
        </div>
      </form>
    </SurfaceStage>
  );
}

export function MovieAction({
  hasProviders,
  movieId,
  onOpenProviders,
  title,
}: {
  hasProviders: boolean;
  movieId: number;
  onOpenProviders: () => void;
  title: string;
}): JSX.Element | null {
  const auth = useAuth();
  const actionClass = useDockActionClass();
  const { slots } = useDockTheme();
  const { openSurface } = useDockActions();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ? `${userId}:${movieId}` : null;

  const [own, setOwn] = useState<{
    key: string;
    review: ReviewInput | null;
  } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getOwnMovieReviewAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setOwn({ key, review: result.review });
        else report("MovieAction load", result.error);
      })
      .catch((error) => report("MovieAction load", error));

    return () => {
      cancelled = true;
    };
  }, [key, movieId, version]);

  useGlobalEvent(key ? REVIEW_EVENTS.CHANGE : null, () =>
    setVersion((current) => current + 1),
  );

  const loaded = own?.key === key;
  const review = loaded ? own.review : null;

  const openEditor = useCallback(() => {
    void openSurface(
      createReviewEditorSurfaceEntry({
        kind: "movie",
        movieId,
        onSaved: (saved) => key && setOwn({ key, review: saved }),
        review,
        title,
      }),
    );
  }, [key, movieId, openSurface, review, title]);

  if (!auth.isReady) return null;

  const providers = hasProviders ? (
    <Button
      className={actionClass({
        className: userId ? slots.actionFill : "w-full",
      })}
      onClick={onOpenProviders}
      type="button"
    >
      <Icon icon="solar:tv-bold" size={16} />
      <span className={slots.actionLabel}>Where to watch?</span>
    </Button>
  ) : null;

  const wrap = (content: JSX.Element | null) =>
    content ? <DockAction>{content}</DockAction> : null;

  if (!userId) return wrap(providers);

  const write = (
    <Button
      className={actionClass({
        className: providers ? slots.actionFill : "w-full",
      })}
      disabled={!loaded}
      onClick={openEditor}
      type="button"
    >
      <Icon icon="solar:pen-new-square-bold" size={16} />
      <span className={slots.actionLabel}>
        {review ? "Edit Review" : "Add Review"}
      </span>
    </Button>
  );

  if (!providers) return wrap(write);
  return wrap(
    <div className={slots.actionRow}>
      {write}
      {providers}
    </div>,
  );
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
