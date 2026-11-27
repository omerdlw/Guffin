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
import {
  ActionIcon,
  ActionLabel,
  ActionTip,
} from "@/design/components/action-content";
import { useSurfacePreload } from "@/design/surface/lazy";
import { DockAction } from "@/design/surface/surface";
import { useAuth } from "@/features/auth/provider";
import { getOwnMovieReviewAction } from "../actions";
import { REVIEW_EVENTS, REVIEW_ICON, type ReviewInput } from "../model";
import type { ReviewsPager } from "../pager";
import { reviewEditorSurface } from "../surfaces";

// The dock mounts the action again when it moves between its card and compact
// layouts. The own review is kept here, so the new copy starts loaded (no
// disabled button, no new request) and only asks again once it has gone stale.
const FRESH_MS = 5000;
const ownCache = new Map<string, { at: number; review: ReviewInput | null }>();

export function MovieAction({
  extra = null,
  hasProviders,
  pager = null,
  reviews = false,
  movieId,
  onOpenProviders,
  title,
}: {
  extra?: JSX.Element | null;
  hasProviders: boolean;
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
  const key = userId ? `${userId}:${movieId}` : null;

  const [own, setOwn] = useState<{
    key: string;
    review: ReviewInput | null;
  } | null>(() => {
    const kept = key ? ownCache.get(key) : null;
    return key && kept ? { key, review: kept.review } : null;
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    const kept = ownCache.get(key);
    if (version === 0 && kept && Date.now() - kept.at < FRESH_MS) return;
    let cancelled = false;

    getOwnMovieReviewAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          ownCache.set(key, { at: Date.now(), review: result.review });
          setOwn({ key, review: result.review });
        } else report("MovieAction load", result.error);
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
    void reviewEditorSurface.open(openSurface, {
      data: {
        kind: "movie",
        movieId,
        onSaved: (saved) => {
          if (!key) return;
          ownCache.set(key, { at: Date.now(), review: saved });
          setOwn({ key, review: saved });
        },
        review,
        title,
      },
    });
  }, [key, movieId, openSurface, review, title]);

  if (!auth.isReady) return null;

  const more =
    reviews && pager && pager.left > 0 ? (
      <ActionTip text={`More reviews (${pager.left})`}>
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
      </ActionTip>
    ) : null;

  const providers = reviews ? (
    more
  ) : hasProviders ? (
    <ActionTip text="Where to watch?">
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
    </ActionTip>
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
      <ActionIcon icon={REVIEW_ICON} />
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
