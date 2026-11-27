"use client";

import { type CSSProperties, type JSX, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MediaCard } from "@/design/components/media-card";
import { Select } from "@/design/components/select";
import { RADIUS } from "@/design/foundations/geometry";
import { GLASS } from "@/design/foundations/layers";
import { TONES } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import {
  REVIEW_ROW,
  ReviewCard,
  ReviewMeta,
} from "@/features/reviews/components/review-card";
import { ReviewActions } from "@/features/reviews/components/review-controls";
import { RatingStars, Star } from "@/features/reviews/components/rating";
import { isRated } from "@/features/reviews/model";
import { pluralize } from "@/shared/format";
import { reviewHref } from "@/shared/site";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { loadReviewsPage } from "../actions";
import {
  KIND_PARAM,
  type ProfileReview,
  REVIEW_KINDS,
  REVIEW_SORTS,
  type ReviewKind,
  type ReviewSort,
  type ReviewSummary,
  type ReviewsPage,
  SORT_PARAM,
} from "../model";

const CHIP =
  "center h-control-sm rounded-full px-fib-3 type-control font-medium whitespace-nowrap";

const SORT_OPTIONS = (Object.keys(REVIEW_SORTS) as ReviewSort[]).map(
  (value) => ({ label: REVIEW_SORTS[value], value }),
);

export function ReviewsSummary({
  summary,
}: {
  summary: ReviewSummary;
}): JSX.Element {
  const peak = Math.max(1, ...summary.distribution);
  const parts = [
    pluralize(summary.written, "review"),
    pluralize(summary.rated, "rating"),
  ];

  return (
    <header
      className="flex flex-wrap items-end justify-between gap-fib-4"
      data-part="header"
    >
      <p className="flex flex-wrap items-center gap-x-fib-2 type-meta text-ink-muted tabular-nums">
        {parts.map((part, index) => (
          <span key={part}>
            {index > 0 ? (
              <span aria-hidden="true" className="mr-fib-2 text-ink-faint">
                ·
              </span>
            ) : null}
            {part}
          </span>
        ))}
        {summary.average !== null ? (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="mr-1 text-ink-faint">
              ·
            </span>
            <Star fill={1} size={11} />
            {summary.average.toFixed(1)} average
          </span>
        ) : null}
      </p>
      {summary.rated > 0 ? (
        <figure
          aria-label="How the ratings spread, half a star to five"
          className="flex items-end gap-fib-2"
          data-part="spread"
        >
          <Star fill={0.5} size={10} />
          <ol className="flex h-fib-6 items-end gap-0.5">
            {summary.distribution.map((total, step) => (
              <li
                className={cn(
                  "w-fib-2 rounded-t-mark",
                  total > 0 ? "bg-rated" : "bg-fill",
                )}
                key={step}
                style={{ height: `${Math.max(8, (total / peak) * 100)}%` }}
                title={`${(step + 1) / 2} stars: ${total}`}
              />
            ))}
          </ol>
          <RatingStars rating={5} size={10} />
        </figure>
      ) : null}
    </header>
  );
}

export function ReviewsFilters({
  base,
  kind,
  sort,
}: {
  base: string;
  kind: ReviewKind;
  sort: ReviewSort;
}): JSX.Element {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [chosen, setChosen] = useState({ kind, sort });
  const [served, setServed] = useState({ kind, sort });
  if (served.kind !== kind || served.sort !== sort) {
    setServed({ kind, sort });
    setChosen({ kind, sort });
  }

  const go = (next: { kind: ReviewKind; sort: ReviewSort }) => {
    if (next.kind === chosen.kind && next.sort === chosen.sort) return;
    setChosen(next);
    const query = new URLSearchParams();
    if (next.kind !== "all") query.set(KIND_PARAM, next.kind);
    if (next.sort !== "newest") query.set(SORT_PARAM, next.sort);
    const search = query.toString();
    const href = search ? `${base}?${search}` : base;
    startTransition(() => router.replace(href, { scroll: false }));
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-fib-3"
      data-part="filters"
    >
      <nav aria-label="Kinds of review" className="flex flex-wrap gap-fib-1">
        {(Object.keys(REVIEW_KINDS) as ReviewKind[]).map((key) => (
          <button
            aria-pressed={key === chosen.kind}
            className={cn(
              CHIP,
              key === chosen.kind
                ? TONES.chosen
                : "text-ink-muted hover:bg-fill hover:text-ink",
            )}
            key={key}
            onClick={() => go({ ...chosen, kind: key })}
            type="button"
          >
            {REVIEW_KINDS[key]}
          </button>
        ))}
      </nav>
      <Select
        ariaLabel="Order"
        className="w-40"
        onChange={(value) => go({ ...chosen, sort: value as ReviewSort })}
        options={SORT_OPTIONS}
        shape="pill"
        size="sm"
        value={chosen.sort}
      />
    </div>
  );
}

function RatingTile({
  review,
  username,
}: {
  review: ProfileReview;
  username: string;
}): JSX.Element {
  const label = review.title;

  return (
    <li data-part="tile">
      <MediaCard
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={20}
        href={reviewHref(review.tmdbId, username)}
        image={{
          sizes: "(min-width: 896px) 210px, 25vw",
          src: tmdbImageUrl("poster", review.posterPath, "w342"),
          srcSet:
            tmdbImageSrcSet("poster", review.posterPath, ["w185", "w342"]) ??
            undefined,
        }}
        label={review.year ? `${label} (${review.year})` : label}
        overlay={
          <span
            className={cn(
              GLASS,
              "liquid-clear pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-fib-2 px-fib-3 py-fib-3 text-center [--rated-off:var(--rated-off-glass)]",
              review.tint
                ? "liquid-poster"
                : "[--liquid-tint:var(--liquid-tint-pure)]",
            )}
            style={
              {
                "--poster": review.tint ?? undefined,
                borderRadius: RADIUS.card,
              } as CSSProperties
            }
          >
            <span className="w-full truncate type-body leading-tight font-semibold text-ink">
              {label}
            </span>
            {isRated(review.rating) ? (
              <RatingStars rating={review.rating} size={16} />
            ) : null}
          </span>
        }
        radius={RADIUS.card}
      />
    </li>
  );
}

function Row({
  isOwner,
  review,
  signedIn,
  username,
}: {
  isOwner: boolean;
  review: ProfileReview;
  signedIn: boolean;
  username: string;
}): JSX.Element {
  const href = reviewHref(review.tmdbId, username);

  return (
    <li className={REVIEW_ROW} data-part="review">
      <ReviewCard
        actions={
          <ReviewActions
            id={review.id}
            isOwner={isOwner}
            liked={review.liked}
            likesCount={review.likesCount}
            quietZero
            signedIn={signedIn}
          />
        }
        content={review.content}
        date={review.updatedAt}
        href={href}
        isSpoiler={review.isSpoiler}
        lead={
          <MediaCard
            fallbackIcon="solar:clapperboard-play-bold"
            fallbackIconSize={16}
            href={href}
            image={{
              sizes: "72px",
              src: tmdbImageUrl("poster", review.posterPath, "w185"),
              srcSet:
                tmdbImageSrcSet("poster", review.posterPath, ["w92", "w185"]) ??
                undefined,
            }}
            label={
              review.year ? `${review.title} (${review.year})` : review.title
            }
            radius={RADIUS.tile}
          />
        }
        meta={
          <>
            {review.year ? <ReviewMeta faint>{review.year}</ReviewMeta> : null}
          </>
        }
        rating={review.rating}
        title={review.title}
      />
    </li>
  );
}

export function ReviewsList({
  isOwner,
  kind,
  page,
  signedIn,
  sort,
  username,
}: {
  isOwner: boolean;
  kind: ReviewKind;
  page: ReviewsPage;
  signedIn: boolean;
  sort: ReviewSort;
  username: string;
}): JSX.Element {
  const [served, setServed] = useState(page);
  const [items, setItems] = useState(page.items);
  const [next, setNext] = useState(page.next);
  const [pending, startTransition] = useTransition();
  if (page !== served) {
    setServed(page);
    setItems(page.items);
    setNext(page.next);
  }

  const more = () => {
    if (next === null) return;
    startTransition(async () => {
      const result = await loadReviewsPage({
        kind,
        offset: next,
        sort,
        username,
      });
      setItems((current) => [...current, ...result.items]);
      setNext(result.next);
    });
  };

  return (
    <div className="flex flex-col gap-fib-5">
      {kind === "ratings" ? (
        <ul className="grid grid-cols-4 gap-fib-3">
          {items.map((review) => (
            <RatingTile key={review.id} review={review} username={username} />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col">
          {items.map((review) => (
            <Row
              isOwner={isOwner}
              key={review.id}
              review={review}
              signedIn={signedIn}
              username={username}
            />
          ))}
        </ul>
      )}
      {next !== null ? (
        <button
          aria-busy={pending || undefined}
          className={cn(
            TONES.outline,
            "self-center rounded-full px-fib-4 h-control-sm type-control font-medium disabled:opacity-50",
          )}
          disabled={pending}
          onClick={more}
          type="button"
        >
          {pending ? "Loading…" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
