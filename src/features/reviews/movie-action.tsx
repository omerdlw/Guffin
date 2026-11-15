"use client";

import { type JSX, useCallback, useEffect, useState } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockTheme,
} from "@omerdlw/base-framework/dock";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { Button } from "@omerdlw/base-framework/ui";
import { report } from "@omerdlw/base-framework/utils";
import { ActionIcon, ActionLabel } from "@/design/components/action-content";
import { DockAction } from "@/design/components/surface";
import { useSurfacePreload } from "@/design/lazy-surface";
import { useAuth } from "@/features/auth/provider";
import type { MediaType } from "@/lib/tmdb/shared";
import { getOwnMovieReviewAction } from "./actions";
import type { ReviewsPager } from "./pager";
import { REVIEW_EVENTS, type ReviewInput } from "./review";
import { reviewEditorSurface } from "./surfaces";

export function MovieAction({
  extra = null,
  hasProviders,
  pager = null,
  reviews = false,
  mediaType = "movie",
  movieId,
  onOpenProviders,
  title,
}: {
  extra?: JSX.Element | null;
  hasProviders: boolean;
  mediaType?: MediaType;
  movieId: number;
  onOpenProviders: () => void;
  pager?: ReviewsPager | null;
  reviews?: boolean;
  title: string;
}): JSX.Element | null {
  const auth = useAuth();
  const actionClass = useDockActionClass();
  const { slots } = useDockTheme();
  const { openSurface } = useDockActions();
  useSurfacePreload(reviewEditorSurface);
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ? `${userId}:${mediaType}:${movieId}` : null;

  const [own, setOwn] = useState<{
    key: string;
    review: ReviewInput | null;
  } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getOwnMovieReviewAction(movieId, mediaType)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setOwn({ key, review: result.review });
        else report("MovieAction load", result.error);
      })
      .catch((error) => report("MovieAction load", error));

    return () => {
      cancelled = true;
    };
  }, [key, mediaType, movieId, version]);

  useGlobalEvent(key ? REVIEW_EVENTS.CHANGE : null, () =>
    setVersion((current) => current + 1),
  );

  const loaded = own?.key === key;
  const review = loaded ? own.review : null;

  const openEditor = useCallback(() => {
    void reviewEditorSurface.open(openSurface, {
      data: {
        kind: "movie",
        mediaType,
        movieId,
        onSaved: (saved) => key && setOwn({ key, review: saved }),
        review,
        title,
      },
    });
  }, [key, mediaType, movieId, openSurface, review, title]);

  if (!auth.isReady) return null;

  const clear =
    reviews && pager?.reviewer ? (
      <Button
        className={actionClass({
          className: userId ? slots.actionFill : "w-full",
        })}
        onClick={pager.clear}
        type="button"
      >
        <ActionIcon icon="solar:users-group-rounded-bold" />
        <ActionLabel className={slots.actionLabel}>All reviews</ActionLabel>
      </Button>
    ) : null;

  const more =
    reviews && pager && !pager.reviewer && pager.left > 0 ? (
      <Button
        className={actionClass({
          className: userId ? slots.actionFill : "w-full",
        })}
        disabled={pager.loading}
        onClick={pager.more}
        type="button"
      >
        <ActionIcon
          icon={
            pager.loading
              ? "svg-spinners:90-ring-with-bg"
              : "solar:alt-arrow-down-bold"
          }
        />
        <ActionLabel className={slots.actionLabel}>
          {`More reviews (${pager.left})`}
        </ActionLabel>
      </Button>
    ) : null;

  const providers = reviews ? (
    (clear ?? more)
  ) : hasProviders ? (
    <Button
      className={actionClass({
        className: userId ? slots.actionFill : "w-full",
      })}
      onClick={onOpenProviders}
      type="button"
    >
      <ActionIcon icon="solar:tv-bold" />
      <ActionLabel className={slots.actionLabel}>Where to watch?</ActionLabel>
    </Button>
  ) : null;

  const wrap = (content: JSX.Element | null) =>
    content || extra ? (
      <DockAction>
        {extra}
        {content}
      </DockAction>
    ) : null;

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
      <ActionIcon icon="solar:pen-new-square-bold" />
      <ActionLabel className={slots.actionLabel}>
        {review ? "Edit Review" : "Add Review"}
      </ActionLabel>
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
