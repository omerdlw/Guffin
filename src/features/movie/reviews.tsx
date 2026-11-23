"use client";

import { type JSX, useEffect, useRef, useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { Avatar } from "@omerdlw/base-framework/ui";
import { report } from "@omerdlw/base-framework/utils";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { Select } from "@/design/components/select";
import { TONE } from "@/design/foundations/tones";
import { useSurfacePreload } from "@/design/lazy-surface";
import { Heading } from "@/features/detail/layout";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
} from "@/features/detail/motion";
import {
  getMovieReviewsPageAction,
  getViewerMovieReviewAction,
} from "@/features/reviews/actions";
import { REVIEW_ROW, ReviewCard } from "@/features/reviews/card";
import { ReviewActions } from "@/features/reviews/controls";
import { setReviewsPager } from "@/features/reviews/pager";
import { RatingStars, Star } from "@/features/reviews/rating";
import {
  isMovieReviewFilter,
  isMovieReviewSort,
  isRated,
  MOVIE_REVIEW_FILTERS,
  MOVIE_REVIEW_SORTS,
  type MovieReview,
  type MovieReviewFilter,
  type MovieReviewSort,
  REVIEW_EVENTS,
  REVIEWS_PAGE_SIZE,
} from "@/features/reviews/review";
import { reviewEditorSurface } from "@/features/reviews/surfaces";
import { accountHref, movieReviewsHref } from "@/shared/project";

interface ReviewDigest {
  mine: MovieReview | null;
  popular: MovieReview[];
  recent: MovieReview[];
  viewerId: string | null;
}

interface ReviewsQuery {
  filter: MovieReviewFilter;
  sort: MovieReviewSort;
}

interface ReviewsPage {
  key: string;
  reviews: MovieReview[];
  stats: { average: number | null; rated: number; total: number };
  total: number;
  viewerId: string | null;
}

const DIGEST_SHOWN = 4;

const SORT_LABELS: Record<MovieReviewSort, string> = {
  likes_asc: "Least liked",
  likes_desc: "Most liked",
  newest: "Newest",
  oldest: "Oldest",
  rating_asc: "Lowest rated",
  rating_desc: "Highest rated",
};

const REVIEW_SORT_OPTIONS = MOVIE_REVIEW_SORTS.map((sort) => ({
  label: SORT_LABELS[sort.value],
  value: sort.value,
}));

function emptyReviewsMessage(filter: string): string {
  return filter !== "all"
    ? "No entries match this filter"
    : "No reviews yet. Be the first.";
}

function useReviewRefresh(): number {
  const [version, setVersion] = useState(0);
  useGlobalEvent<{ reason?: string }>(REVIEW_EVENTS.CHANGE, (payload) => {
    if (payload?.reason !== "like") setVersion((current) => current + 1);
  });
  return version;
}

function LitFilmLike({ author }: { author: string }) {
  return (
    <DetailPart as="span" className="inline-flex shrink-0" name="star">
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
  rating,
}: {
  rating: number | null;
}): JSX.Element {
  if (!isRated(rating)) return <RatingStars rating={rating} />;
  const value = Math.min(5, rating);
  return (
    <DetailPart as="span" className="inline-flex items-center" name="star">
      <span
        aria-label={`${value} out of 5`}
        className="inline-flex items-center gap-1"
        role="img"
        title={`${value} out of 5`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Star fill={value - index} key={index} size={14} />
        ))}
      </span>
    </DetailPart>
  );
}

function ReviewRow({
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
  const router = useRouter();
  const { openSurface } = useDockActions();
  useSurfacePreload(reviewEditorSurface);
  const profile = accountHref(review.author.username);
  const hasRating = isRated(review.rating);

  return (
    <DetailPart as="li" className={REVIEW_ROW} index={index} name="review">
      <ReviewCard
        actions={
          <ReviewActions
            id={review.id}
            isOwner={review.author.id === viewerId}
            liked={review.liked}
            likesCount={review.likesCount}
            onEdit={() =>
              void reviewEditorSurface.open(openSurface, {
                data: {
                  kind: "movie",
                  movieId,
                  onSaved: () => router.refresh(),
                  review: {
                    content: review.content,
                    isSpoiler: review.isSpoiler,
                    rating: review.rating,
                  },
                  title,
                },
              })
            }
            quietZero
            signedIn={viewerId !== null}
          />
        }
        content={review.content}
        date={review.updatedAt}
        href={profile}
        isSpoiler={review.isSpoiler}
        lead={
          <DockLink className="flex" href={profile}>
            <Avatar
              className="rounded-full"
              name={review.author.displayName}
              size={44}
              src={review.author.avatarUrl ?? undefined}
            />
          </DockLink>
        }
        leadShape="avatar"
        marks={
          review.authorLiked ? (
            <LitFilmLike author={review.author.displayName} />
          ) : null
        }
        rating={review.rating}
        stars={hasRating ? <LitStars rating={review.rating} /> : null}
        title={review.author.displayName}
      />
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
  return (
    <DetailSection
      className={`flex w-full min-w-0 flex-col ${className}`}
      cue="digest"
    >
      <Heading
        actions={
          actions !== undefined ? (
            (actions ?? null)
          ) : (
            <DockLink
              className={TONE.link}
              href={movieReviewsHref(movieId, {
                sort: sort === "newest" ? undefined : sort,
              })}
            >
              More
            </DockLink>
          )
        }
        icon={icon}
        title={title}
      />
      <ul className="flex flex-col">
        {reviews.map((review, index) => (
          <ReviewRow
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
  const [digest, setDigest] = useState<ReviewDigest | null>(null);
  const version = useReviewRefresh();

  useEffect(() => {
    let cancelled = false;
    const read = (sort: MovieReviewSort) =>
      getMovieReviewsPageAction(movieId, {
        filter: "written",
        from: 0,
        limit: DIGEST_SHOWN,
        sort,
        username: null,
      });

    Promise.all([
      read("likes_desc"),
      read("newest"),
      getViewerMovieReviewAction(movieId),
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
  }, [movieId, version]);

  if (!digest) return null;
  const { mine, popular, recent, viewerId } = digest;
  if (!mine && popular.length === 0 && recent.length === 0) return null;

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
      {popular.length > 0 || recent.length > 0 ? (
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
      ) : null}
    </>
  );
}

export function MovieReviews({
  initialSort = "newest",
  movieId,
  title,
}: {
  initialSort?: MovieReviewSort;
  movieId: number;
  title: string;
}): JSX.Element {
  const [query, setQuery] = useState<ReviewsQuery>({
    filter: "all",
    sort: initialSort,
  });
  const { filter, sort } = query;
  const key = `${filter}:${sort}`;
  const [page, setPage] = useState<ReviewsPage | null>(null);
  const version = useReviewRefresh();
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMovieReviewsPageAction(movieId, {
      filter,
      from: 0,
      limit: REVIEWS_PAGE_SIZE,
      sort,
      username: null,
    })
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
  }, [filter, key, movieId, sort, version]);

  const change = (patch: Partial<ReviewsQuery>) =>
    setQuery((current) => ({ ...current, ...patch }));

  const loadMore = () => {
    if (!page || loadingMore) return;
    setLoadingMore(true);
    getMovieReviewsPageAction(movieId, {
      filter,
      from: page.reviews.length,
      limit: REVIEWS_PAGE_SIZE,
      sort,
      username: null,
    })
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
  useEffect(() => {
    latest.current = loadMore;
  });
  useEffect(() => {
    setReviewsPager(
      stats
        ? {
            left,
            loading: loadingMore,
            more: () => latest.current(),
            stats,
          }
        : null,
    );
  }, [left, loadingMore, stats]);
  useEffect(() => () => setReviewsPager(null), []);

  return (
    <DetailSection className="flex w-full flex-col" cue="board">
      <DetailPart className="mb-6 grid w-full grid-cols-2 gap-3" name="control">
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

      {page ? (
        <DetailSwap
          as="ul"
          className="flex flex-col"
          cue="reviews"
          id={page.key}
        >
          {page.reviews.length > 0 ? (
            page.reviews.map((review, index) => (
              <ReviewRow
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
              {emptyReviewsMessage(filter)}
            </DetailPart>
          )}
        </DetailSwap>
      ) : null}
    </DetailSection>
  );
}
