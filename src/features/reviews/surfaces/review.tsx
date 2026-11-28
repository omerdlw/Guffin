"use client";

import { type JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { Avatar, Image } from "@omerdlw/base-framework/ui";
import { report } from "@omerdlw/base-framework/utils";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { TONE } from "@/design/foundations/tones";
import {
  rowVariants,
  SURFACE_META,
  SURFACE_PANEL,
  SURFACE_POSTER,
  SURFACE_SCROLL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/design/surface/classes";
import { defineSurface } from "@/design/surface/define";
import { useSurfacePreload } from "@/design/surface/lazy";
import {
  SurfaceLoading,
  SurfacePart,
  SurfaceStage,
  SurfaceSwap,
} from "@/design/surface/surface";
import { cn } from "@/design/ui";
import { formatShortDate } from "@/features/account/model";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { accountHref, movieHref, movieReviewsHref } from "@/shared/site";
import { getMemberReviewAction } from "../actions";
import { RatingStars } from "../components/rating";
import { ReviewActions, ReviewBody } from "../components/review-controls";
import {
  isRated,
  type MovieReview,
  REVIEW_EVENTS,
  REVIEW_ICON,
} from "../model";
import { reviewEditorSurface } from "./";

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

// The film the review is about, one tap from its page.
function FilmRow({ film, id }: { film: Film; id: number }): JSX.Element {
  const poster = tmdbImageUrl("poster", film.posterPath, "w154");
  return (
    <DockLink
      className={rowVariants({ className: "pr-6" })}
      href={movieHref(id)}
    >
      <span
        className={cn(SURFACE_POSTER, SURFACE_TILE_INNER, "relative bg-plate")}
      >
        {poster ? (
          <Image alt="" className="object-cover" sizes="40px" src={poster} />
        ) : null}
      </span>
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{film.title}</span>
        {film.year ? (
          <span className={cn(SURFACE_META, "tabular-nums")}>{film.year}</span>
        ) : null}
      </span>
      <Icon
        className="shrink-0 text-ink-muted group-hover:text-ink"
        icon="solar:alt-arrow-right-linear"
        size={18}
      />
    </DockLink>
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
          <SurfaceLoading />
        ) : (
          <>
            <SurfacePart name="item">
              <FilmRow film={source.film} id={target.tmdbId} />
            </SurfacePart>
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
