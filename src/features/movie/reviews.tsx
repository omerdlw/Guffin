"use client";

import { type JSX, useEffect, useRef, useState } from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { report } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { useScrollDriver } from "@/motion/react";
import { Heading } from "@/features/detail/layout";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
  useDetailAct,
} from "@/features/detail/motion";
import {
  getMovieReviewsPageAction,
  getViewerMovieReviewAction,
} from "@/features/reviews/actions";
import {
  MOVIE_REVIEW_FILTERS,
  REVIEW_EVENTS,
  REVIEWS_PAGE_SIZE,
} from "@/features/reviews/constants";
import { ReviewActions, ReviewBody } from "@/features/reviews/controls";
import { setReviewsPager } from "@/features/reviews/pager";
import { useMediaType } from "@/features/media/context";
import { createReviewEditorSurfaceEntry } from "@/features/reviews/editor";
import { RatingStars, Star } from "@/features/reviews/rating";
import type { MovieReview, MovieReviewSort } from "@/features/reviews/types";
import {
  isMovieReviewFilter,
  isMovieReviewSort,
  isRated,
} from "@/features/reviews/utils";
import { accountHref, movieReviewsHref } from "@/lib/project";
import { Avatar } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { Select } from "@/design/components/select";
import { TONE } from "@/design/foundations/tones";
import {
  DIGEST_LIGHTS,
  DIGEST_SHOWN,
  REVIEW_DATE_FORMAT,
  REVIEW_SORT_OPTIONS,
} from "./constants";
import type { ReviewDigest, ReviewsPage, ReviewsQuery } from "./types";
import { emptyReviewsMessage } from "./utils";

function useReviewRefresh(): number {
  const [version, setVersion] = useState(0);
  useGlobalEvent<{ reason?: string }>(REVIEW_EVENTS.CHANGE, (payload) => {
    if (payload?.reason !== "like") setVersion((current) => current + 1);
  });
  return version;
}

function LitStar({ fill, index }: { fill: number; index: number }) {
  return (
    <DetailPart as="span" className="inline-flex" index={index} name="star">
      <Star fill={fill} size={14} />
    </DetailPart>
  );
}

function LitFilmLike({ author, index }: { author: string; index: number }) {
  return (
    <DetailPart
      as="span"
      className="inline-flex shrink-0"
      index={index}
      name="star"
    >
      <Icon
        aria-label={`${author} liked this film`}
        className="text-liked"
        icon="solar:heart-bold"
        size={14}
      />
    </DetailPart>
  );
}

function LitStars({
  first,
  rating,
}: {
  first: number;
  rating: number | null;
}): JSX.Element {
  if (!isRated(rating)) return <RatingStars rating={rating} />;
  const value = Math.min(5, rating);
  return (
    <span
      aria-label={`${value} out of 5`}
      className="inline-flex items-center gap-1"
      role="img"
      title={`${value} out of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <LitStar fill={value - index} index={first + index} key={index} />
      ))}
    </span>
  );
}

function ReviewCard({
  index,
  movieId,
  review,
  title,
  viewerId,
}: {
  index: number;
  movieId: number;
  review: MovieReview;
  title: string;
  viewerId: string | null;
}): JSX.Element {
  const first = index * DIGEST_LIGHTS;
  const mediaType = useMediaType();
  const router = useRouter();
  const { openSurface } = useDockActions();
  const profile = accountHref(review.author.username);
  const hasRating = isRated(review.rating);

  return (
    <DetailPart
      as="li"
      className="flex py-6 first:pt-0 last:pb-0"
      index={index}
      name="review"
    >
      <article className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-start gap-x-3.5 gap-y-3">
        <DockLink className="flex shrink-0 self-start" href={profile}>
          <Avatar
            className="rounded-full"
            name={review.author.displayName}
            size={44}
            src={review.author.avatarUrl ?? undefined}
          />
        </DockLink>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <DockLink
              className="block truncate type-base font-semibold text-ink underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:decoration-current"
              href={profile}
            >
              {review.author.displayName}
            </DockLink>
            <time
              className="type-meta font-semibold text-ink-muted"
              dateTime={review.updatedAt}
            >
              {REVIEW_DATE_FORMAT.format(new Date(review.updatedAt))}
            </time>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
            <div className="flex shrink-0 items-center gap-2.5">
              <LitStars first={first} rating={review.rating} />
              {review.authorLiked ? (
                <LitFilmLike
                  author={review.author.displayName}
                  index={first + (hasRating ? 5 : 0)}
                />
              ) : null}
            </div>
            <div className="shrink-0">
              <ReviewActions
                id={review.id}
                isOwner={review.author.id === viewerId}
                liked={review.liked}
                likesCount={review.likesCount}
                onEdit={() =>
                  void openSurface(
                    createReviewEditorSurfaceEntry({
                      kind: "movie",
                      mediaType,
                      movieId,
                      onSaved: () => router.refresh(),
                      review: {
                        content: review.content,
                        isSpoiler: review.isSpoiler,
                        rating: review.rating,
                      },
                      title,
                    }),
                  )
                }
                signedIn={viewerId !== null}
              />
            </div>
          </div>
        </div>

        {review.content ? (
          <div className="col-start-2 min-w-0 [&_p]:type-copy [&_p]:leading-7 [&_p]:text-ink-body">
            <ReviewBody
              content={review.content}
              isSpoiler={review.isSpoiler}
              revealShape="pill"
            />
          </div>
        ) : null}
      </article>
    </DetailPart>
  );
}

function ReviewsSection({
  actions,
  className = "",
  icon,
  movieId,
  reviews,
  sort,
  title,
  movieTitle,
  viewerId,
}: {
  actions?: JSX.Element | null;
  className?: string;
  icon: string;
  movieId: number;
  movieTitle: string;
  reviews: readonly MovieReview[];
  sort: MovieReviewSort;
  title: string;
  viewerId: string | null;
}): JSX.Element {
  const mediaType = useMediaType();
  return (
    <DetailSection
      className={`flex w-full min-w-0 flex-col ${className}`}
      cue="digest"
    >
      <Heading
        actions={
          actions !== undefined ? (
            actions
          ) : (
            <DockLink
              className={TONE.link}
              href={movieReviewsHref(
                movieId,
                { sort: sort === "newest" ? undefined : sort },
                mediaType,
              )}
            >
              More
            </DockLink>
          )
        }
        icon={icon}
        title={title}
      />
      <ul className={`flex flex-col divide-y ${TONE.rules}`}>
        {reviews.map((review, index) => (
          <ReviewCard
            index={index}
            key={review.id}
            movieId={movieId}
            review={review}
            title={movieTitle}
            viewerId={viewerId}
          />
        ))}
      </ul>
    </DetailSection>
  );
}

export function MovieReviewDigest({
  movieId,
  title,
}: {
  movieId: number;
  title: string;
}): JSX.Element | null {
  const mediaType = useMediaType();
  const [digest, setDigest] = useState<ReviewDigest | null>(null);
  const version = useReviewRefresh();

  useEffect(() => {
    let cancelled = false;
    const read = (sort: MovieReviewSort) =>
      getMovieReviewsPageAction(
        movieId,
        {
          filter: "written",
          from: 0,
          limit: DIGEST_SHOWN,
          sort,
          username: null,
        },
        mediaType,
      );

    Promise.all([
      read("likes_desc"),
      read("newest"),
      getViewerMovieReviewAction(movieId, mediaType),
    ])
      .then(([popular, recent, mine]) => {
        if (cancelled) return;
        if (!popular.success) return report("Review digest", popular.error);
        if (!recent.success) return report("Review digest", recent.error);
        if (!mine.success) report("Review digest", mine.error);
        const own = mine.success ? mine.review : null;
        const others = (review: MovieReview) => review.id !== own?.id;
        setDigest({
          mine: own,
          popular: popular.reviews.filter(
            (review) => review.likesCount > 0 && others(review),
          ),
          recent: recent.reviews.filter(others),
          viewerId: recent.viewerId,
        });
      })
      .catch((error) => report("Review digest", error));

    return () => {
      cancelled = true;
    };
  }, [mediaType, movieId, version]);

  if (!digest) return null;
  const { mine, popular, recent, viewerId } = digest;

  return (
    <>
      {mine ? (
        <ReviewsSection
          actions={null}
          icon="solar:user-bold"
          movieId={movieId}
          movieTitle={title}
          reviews={[mine]}
          sort="newest"
          title="Your Review"
          viewerId={viewerId}
        />
      ) : null}
      <div className="grid w-full gap-x-10 gap-y-12 lg:grid-cols-2">
        {popular.length > 0 ? (
          <ReviewsSection
            className="lg:only:col-span-2"
            icon="solar:fire-bold"
            movieId={movieId}
            movieTitle={title}
            reviews={popular}
            sort="likes_desc"
            title="Popular Reviews"
            viewerId={viewerId}
          />
        ) : null}
        {recent.length > 0 ? (
          <ReviewsSection
            className="lg:only:col-span-2"
            icon="solar:clock-circle-bold"
            movieId={movieId}
            movieTitle={title}
            reviews={recent}
            sort="newest"
            title="Recent Reviews"
            viewerId={viewerId}
          />
        ) : null}
      </div>
    </>
  );
}

export function MovieReviews({
  initialSort = "newest",
  movieId,
  reviewer,
  title,
}: {
  initialSort?: MovieReviewSort;
  movieId: number;
  reviewer: string | null;
  title: string;
}): JSX.Element {
  const mediaType = useMediaType();
  const [query, setQuery] = useState<ReviewsQuery>({
    filter: "all",
    sort: initialSort,
    username: reviewer,
  });
  const { filter, sort, username } = query;
  const key = `${filter}:${sort}:${username ?? ""}`;
  const [page, setPage] = useState<ReviewsPage | null>(null);
  const version = useReviewRefresh();
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMovieReviewsPageAction(
      movieId,
      {
        filter,
        from: 0,
        limit: REVIEWS_PAGE_SIZE,
        sort,
        username,
      },
      mediaType,
    )
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setPage({
            key,
            reviews: result.reviews,
            stats: result.stats,
            total: result.total,
            viewerId: result.viewerId,
          });
        } else {
          report("MovieReviews load", result.error);
        }
      })
      .catch((error) => report("MovieReviews load", error));

    return () => {
      cancelled = true;
    };
  }, [filter, key, mediaType, movieId, sort, username, version]);

  const change = (patch: Partial<ReviewsQuery>) =>
    setQuery((current) => ({ ...current, ...patch }));

  const router = useRouter();
  const clearAccount = () =>
    router.replace(
      movieReviewsHref(
        movieId,
        { sort: sort === "newest" ? undefined : sort },
        mediaType,
      ),
      {
        scroll: false,
      },
    );

  const loadMore = () => {
    if (!page || loadingMore) return;
    setLoadingMore(true);
    getMovieReviewsPageAction(
      movieId,
      {
        filter,
        from: page.reviews.length,
        limit: REVIEWS_PAGE_SIZE,
        sort,
        username,
      },
      mediaType,
    )
      .then((result) => {
        if (!result.success) {
          report("MovieReviews more", result.error);
          return;
        }
        setPage((current) => {
          if (!current || current.key !== key) return current;
          const seen = new Set(current.reviews.map((review) => review.id));
          return {
            ...current,
            reviews: [
              ...current.reviews,
              ...result.reviews.filter((review) => !seen.has(review.id)),
            ],
            total: result.total,
          };
        });
      })
      .catch((error) => report("MovieReviews more", error))
      .finally(() => setLoadingMore(false));
  };

  const left = page ? page.total - page.reviews.length : 0;
  const stats = page?.stats ?? null;
  const latest = useRef(loadMore);
  const clearRef = useRef(clearAccount);
  useEffect(() => {
    latest.current = loadMore;
    clearRef.current = clearAccount;
  });
  useEffect(() => {
    setReviewsPager(
      stats
        ? {
            clear: () => clearRef.current(),
            left,
            loading: loadingMore,
            more: () => latest.current(),
            reviewer: username,
            stats,
          }
        : null,
    );
  }, [left, loadingMore, stats, username]);

  const driver = useScrollDriver();
  const act = useDetailAct();
  const landed = useRef(false);
  useEffect(() => {
    if (!username || !page || act === "waiting" || landed.current) return;
    landed.current = true;
    const bottom = document.documentElement.scrollHeight - window.innerHeight;
    if (driver.active) driver.to(bottom);
    else window.scrollTo({ behavior: "smooth", top: bottom });
  }, [act, driver, page, username]);
  useEffect(() => () => setReviewsPager(null), []);

  return (
    <DetailSection className="flex w-full flex-col" cue="board">
      {username ? null : (
        <DetailPart
          className="mb-6 grid w-full grid-cols-2 gap-3"
          name="control"
        >
          <Select
            ariaLabel="Filter reviews"
            className="w-full min-w-0"
            shape="pill"
            onChange={(value) =>
              isMovieReviewFilter(value) && change({ filter: value })
            }
            options={MOVIE_REVIEW_FILTERS}
            value={filter}
          />
          <Select
            ariaLabel="Sort reviews"
            className="w-full min-w-0"
            shape="pill"
            onChange={(value) =>
              isMovieReviewSort(value) && change({ sort: value })
            }
            options={REVIEW_SORT_OPTIONS}
            value={sort}
          />
        </DetailPart>
      )}

      {page ? (
        <DetailSwap
          as="ul"
          className={`flex flex-col divide-y ${TONE.rules}`}
          cue="reviews"
          id={page.key}
        >
          {page.reviews.length > 0 ? (
            page.reviews.map((review, index) => (
              <ReviewCard
                index={index}
                key={review.id}
                movieId={movieId}
                review={review}
                title={title}
                viewerId={page.viewerId}
              />
            ))
          ) : (
            <DetailPart
              as="li"
              className="py-10 text-center type-body text-ink-muted"
              name="review"
            >
              {emptyReviewsMessage(filter, username)}
            </DetailPart>
          )}
        </DetailSwap>
      ) : null}
    </DetailSection>
  );
}
