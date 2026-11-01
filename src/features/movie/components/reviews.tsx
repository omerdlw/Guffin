"use client";

import { useEffect, useState, type JSX } from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { report } from "@omerdlw/base-framework/utils";
import {
  MOVIE_REVIEW_FILTERS,
  MOVIE_REVIEW_SORTS,
  REVIEWS_PAGE_SIZE,
  REVIEW_EVENTS,
  getMovieReviewsPageAction,
  isMovieReviewFilter,
  isMovieReviewSort,
  type MovieReview,
  type MovieReviewFilter,
  type MovieReviewSort,
} from "@/features/reviews";
import { Button, Icon, Select, TONE } from "@/ui";
import { SCENE } from "../motion";
import { Header, Item, Section, Swap } from "@/motion/stage";
import { ReviewCard } from "./review-card";

function Stats({
  stats,
}: {
  stats: { average: number | null; rated: number; total: number };
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 type-meta font-semibold text-ink-muted">
      {stats.average !== null ? (
        <span className="inline-flex items-center gap-1">
          <Icon className="text-rated" icon="solar:star-bold" size={12} />
          <strong className="text-ink">{stats.average}/5</strong>
          <span className="hidden sm:inline">({stats.rated} rated)</span>
        </span>
      ) : null}
      <span>
        <strong className="text-ink">{stats.total}</strong>{" "}
        {stats.total === 1 ? "review" : "reviews"}
      </span>
    </div>
  );
}

const SORT_LABELS: Record<MovieReviewSort, string> = {
  likes_asc: "Least liked",
  likes_desc: "Most liked",
  newest: "Newest",
  oldest: "Oldest",
  rating_asc: "Lowest rated",
  rating_desc: "Highest rated",
};

const SORTS = MOVIE_REVIEW_SORTS.map((sort) => ({
  label: SORT_LABELS[sort.value],
  value: sort.value,
}));

const CHOICE = "min-w-0 flex-1 sm:w-44 sm:flex-none";

function Account({
  name,
  onClear,
}: {
  name: string;
  onClear: () => void;
}): JSX.Element {
  return (
    <Button
      aria-label={`Show everyone's reviews, not only ${name}'s`}
      className={`group inline-flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-full pr-2 pl-3 type-control font-medium ${TONE.chosen}`}
      onClick={onClear}
      title="Show everyone's"
      type="button"
    >
      <span className="truncate">@{name}</span>
      <Icon
        className="ui-fade shrink-0 opacity-70 group-hover:opacity-100"
        icon="material-symbols:close-rounded"
        size={14}
      />
    </Button>
  );
}

interface Query {
  filter: MovieReviewFilter;
  sort: MovieReviewSort;
  username: string | null;
}

interface ReviewsPage {
  key: string;
  reviews: MovieReview[];
  stats: { average: number | null; rated: number; total: number };
  total: number;
  viewerId: string | null;
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
  const [query, setQuery] = useState<Query>({
    filter: "all",
    sort: initialSort,
    username: reviewer,
  });
  const { filter, sort, username } = query;
  const key = `${filter}:${sort}:${username ?? ""}`;
  const [page, setPage] = useState<ReviewsPage | null>(null);
  const [version, setVersion] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMovieReviewsPageAction(movieId, {
      filter,
      from: 0,
      limit: REVIEWS_PAGE_SIZE,
      sort,
      username,
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
  }, [filter, key, movieId, sort, username, version]);

  useGlobalEvent<{ reason?: string }>(REVIEW_EVENTS.CHANGE, (payload) => {
    if (payload?.reason !== "like") setVersion((current) => current + 1);
  });

  const change = (patch: Partial<Query>) =>
    setQuery((current) => ({ ...current, ...patch }));

  const clearAccount = () => {
    change({ username: null });
    const url = new URL(window.location.href);
    url.searchParams.delete("user");
    window.history.replaceState(null, "", url);
  };

  const loadMore = () => {
    if (!page || loadingMore) return;
    setLoadingMore(true);
    getMovieReviewsPageAction(movieId, {
      filter,
      from: page.reviews.length,
      limit: REVIEWS_PAGE_SIZE,
      sort,
      username,
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

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={page ? <Stats stats={page.stats} /> : null}
        icon="solar:chat-round-line-bold"
        title="Reviews"
      />

      <Item className="mb-6 flex flex-wrap items-center gap-3" from="light">
        <Select
          ariaLabel="Filter reviews"
          className={CHOICE}
          classNames={TONE.select}
          onChange={(value) =>
            isMovieReviewFilter(value) && change({ filter: value })
          }
          options={MOVIE_REVIEW_FILTERS}
          size="sm"
          value={filter}
        />
        <Select
          ariaLabel="Sort reviews"
          className={CHOICE}
          classNames={TONE.select}
          onChange={(value) =>
            isMovieReviewSort(value) && change({ sort: value })
          }
          options={SORTS}
          size="sm"
          value={sort}
        />
        {username ? <Account name={username} onClear={clearAccount} /> : null}
      </Item>

      {page ? (
        <Swap
          as="ul"
          className={`flex flex-col divide-y ${TONE.rules}`}
          gap={SCENE.items.cards}
          id={page.key}
        >
          {page.reviews.length > 0 ? (
            page.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                movieId={movieId}
                review={review}
                title={title}
                viewerId={page.viewerId}
              />
            ))
          ) : (
            <Item
              as="li"
              className="py-10 text-center type-body text-ink-muted"
              from="light"
            >
              {filter !== "all"
                ? "No entries match this filter"
                : username
                  ? "No entry from this account yet"
                  : "No reviews yet. Be the first."}
            </Item>
          )}
        </Swap>
      ) : null}

      {page && page.reviews.length < page.total ? (
        <Item className="mt-6" from="light">
          <Button
            className={TONE.more}
            disabled={loadingMore}
            onClick={loadMore}
            type="button"
          >
            {loadingMore ? (
              <Icon icon="svg-spinners:90-ring-with-bg" size={14} />
            ) : null}
            More reviews ({page.total - page.reviews.length})
          </Button>
        </Item>
      ) : null}
    </Section>
  );
}
