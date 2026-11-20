"use client";

import { type JSX, useEffect, useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { Avatar, Loader } from "@omerdlw/base-framework/ui";
import { report } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import {
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/components/surface";
import {
  SURFACE_PANEL,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import { TONE } from "@/design/foundations/tones";
import { useSurfacePreload } from "@/design/lazy-surface";
import { defineSurface } from "@/design/surface-definition";
import { cn } from "@/design/ui";
import { formatShortDate } from "@/features/account/account";
import { accountHref, movieReviewsHref } from "@/lib/project";
import { getMemberReviewAction } from "./actions";
import { ReviewActions, ReviewBody } from "./controls";
import { RatingStars } from "./rating";
import {
  isRated,
  type MovieReview,
  REVIEW_EVENTS,
  REVIEW_ICON,
} from "./review";
import { reviewEditorSurface } from "./surfaces";

export interface ReviewTarget {
  tmdbId: number;
  username: string;
}

interface Film {
  posterPath: string | null;
  title: string;
  year: number | null;
}

type Source =
  | { status: "loading" }
  | { error: string; status: "error" }
  | {
      film: Film;
      review: MovieReview | null;
      status: "ready";
      viewerId: string | null;
    };

const REVIEW_SURFACE_WIDTH = 560;

export const reviewSurface = defineSurface<{ target: ReviewTarget }>({
  component: ReviewSurface,
  description: ({ target }) => `@${target.username}`,
  icon: REVIEW_ICON,
  title: "Review",
  width: REVIEW_SURFACE_WIDTH,
});

function useMemberReview(target: ReviewTarget): Source {
  const { tmdbId, username } = target;
  const [source, setSource] = useState<Source>({ status: "loading" });
  const [version, setVersion] = useState(0);
  useGlobalEvent<{ reason?: string }>(REVIEW_EVENTS.CHANGE, (payload) => {
    if (payload?.reason !== "like") setVersion((current) => current + 1);
  });

  useEffect(() => {
    let cancelled = false;
    getMemberReviewAction(tmdbId, username)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setSource({
            film: result.film,
            review: result.review,
            status: "ready",
            viewerId: result.viewerId,
          });
        } else {
          setSource({ error: result.error, status: "error" });
        }
      })
      .catch((error) => {
        report("Review surface", error);
        if (!cancelled)
          setSource({ error: "Could not load the review", status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbId, username, version]);

  return source;
}

function Note({ children }: { children: JSX.Element }): JSX.Element {
  return (
    <SurfacePart className="center min-h-40 flex-col text-center" name="note">
      {children}
    </SurfacePart>
  );
}

function ReviewSheet({
  film,
  review,
  target,
  viewerId,
}: {
  film: Film;
  review: MovieReview;
  target: ReviewTarget;
  viewerId: string | null;
}): JSX.Element {
  const router = useRouter();
  const { openSurface } = useDockActions();
  useSurfacePreload(reviewEditorSurface);
  const profile = accountHref(review.author.username);
  const isOwner = review.author.id === viewerId;
  const edited = review.updatedAt !== review.createdAt;

  const edit = () =>
    void reviewEditorSurface.open(openSurface, {
      data: {
        kind: "movie",
        movieId: target.tmdbId,
        onSaved: () => router.refresh(),
        review: {
          content: review.content,
          isSpoiler: review.isSpoiler,
          rating: review.rating,
        },
        title: film.title,
      },
    });

  return (
    <article className={cn(SURFACE_PANEL, "flex flex-col")}>
      <header className="flex items-center gap-3 p-4 pb-0">
        <DockLink className="flex shrink-0" href={profile}>
          <Avatar
            className="rounded-full"
            name={review.author.displayName}
            size={40}
            src={review.author.avatarUrl ?? undefined}
          />
        </DockLink>
        <span className="flex min-w-0 flex-1 flex-col">
          <DockLink className={SURFACE_TITLE} href={profile} variant="reveal">
            {review.author.displayName}
          </DockLink>
          <time
            className="type-meta text-ink-muted tabular-nums"
            dateTime={review.updatedAt}
          >
            {formatShortDate(review.createdAt)}
            {edited ? ` · edited ${formatShortDate(review.updatedAt)}` : ""}
          </time>
        </span>
        <span className="mr-1 flex shrink-0 items-center gap-2">
          {isRated(review.rating) ? (
            <RatingStars rating={review.rating} size={16} />
          ) : null}
          {review.authorLiked ? (
            <Icon
              aria-label={`${review.author.displayName} liked this`}
              className="text-liked"
              icon="solar:heart-bold"
              size={16}
            />
          ) : null}
        </span>
      </header>

      {review.content ? (
        <div
          className={cn(
            SURFACE_SCROLL,
            "mt-4 max-h-[min(44dvh,20rem)] px-4 select-text [overflow-wrap:anywhere]",
          )}
          data-scroll-native
        >
          <div className="border-l-2 border-grade/40 pl-4 text-pretty [&_p]:type-base [&_p]:leading-7 [&_p]:text-ink">
            <ReviewBody
              content={review.content}
              isSpoiler={review.isSpoiler}
              revealShape="pill"
            />
          </div>
        </div>
      ) : null}

      <footer className="mt-2 flex items-center justify-between gap-3 px-2 pb-2">
        <ReviewActions
          id={review.id}
          isOwner={isOwner}
          liked={review.liked}
          likesCount={review.likesCount}
          onEdit={edit}
          quietZero
          signedIn={viewerId !== null}
        />
        <DockLink
          className={cn(TONE.link, "pr-2")}
          href={movieReviewsHref(target.tmdbId)}
        >
          All reviews
        </DockLink>
      </footer>
    </article>
  );
}

function ReviewSurface({ target }: { target: ReviewTarget }): JSX.Element {
  const source = useMemberReview(target);
  const status =
    source.status === "ready" && !source.review ? "missing" : source.status;

  return (
    <SurfaceStage>
      <SurfaceSwap className={SURFACE_STACK} cue="items" id={status} now>
        {source.status === "error" ? (
          <Note>
            <p className="type-body text-ink-body">{source.error}</p>
          </Note>
        ) : source.status === "loading" ? (
          <Note>
            <Loader />
          </Note>
        ) : (
          <>
            {source.review ? (
              <SurfacePart name="item">
                <ReviewSheet
                  film={source.film}
                  review={source.review}
                  target={target}
                  viewerId={source.viewerId}
                />
              </SurfacePart>
            ) : (
              <Note>
                <p className="type-body text-ink-body">
                  This review isn&apos;t here anymore
                </p>
              </Note>
            )}
          </>
        )}
      </SurfaceSwap>
    </SurfaceStage>
  );
}
