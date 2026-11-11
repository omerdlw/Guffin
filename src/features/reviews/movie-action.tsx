"use client";

import { type JSX, useCallback, useEffect, useState } from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  useDockActionClass,
  useDockActions,
  useDockTheme,
} from "@omerdlw/base-framework/modules/dock";
import { report } from "@omerdlw/base-framework/utils";
import { useAuth } from "@/features/auth/provider";
import type { MediaType } from "@/features/media/types";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { DockAction } from "@/design/components/surface";
import { getOwnMovieReviewAction } from "./actions";
import { REVIEW_EVENTS } from "./constants";
import { createReviewEditorSurfaceEntry } from "./editor";
import type { ReviewInput } from "./types";

export function MovieAction({
  extra = null,
  hasProviders,
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
  title: string;
}): JSX.Element | null {
  const auth = useAuth();
  const actionClass = useDockActionClass();
  const { slots } = useDockTheme();
  const { openSurface } = useDockActions();
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
    void openSurface(
      createReviewEditorSurfaceEntry({
        kind: "movie",
        mediaType,
        movieId,
        onSaved: (saved) => key && setOwn({ key, review: saved }),
        review,
        title,
      }),
    );
  }, [key, mediaType, movieId, openSurface, review, title]);

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
