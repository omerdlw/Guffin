"use client";

import type { JSX } from "react";
import { Image } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { MoviePosterLink } from "@/features/movie/components/stage";
import { RatingStars } from "@/features/reviews/components/rating";
import {
  ReviewCard,
  ReviewMeta,
  REVIEW_ROW,
} from "@/features/reviews/components/review-card";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { formatCompact, formatRelativeTime } from "@/shared/format";
import { movieHref, reviewHref } from "@/shared/site";
import { type HomeReview, TEXT_LINK_CLASS } from "../model";
import { Heading, HomePart, HomeSection, HomeText } from "../motion";
import { FilmTitle, MemberLink } from "./primitives";

const LEAD_REVIEW_LENGTH = 320;

function Byline({ review }: { review: HomeReview }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 type-control">
      <MemberLink member={review.author} />
      {review.rating ? (
        <span className="flex shrink-0">
          <RatingStars rating={review.rating} size={12} />
        </span>
      ) : null}
      <time
        className="shrink-0 type-meta text-ink-muted"
        dateTime={review.createdAt}
      >
        {formatRelativeTime(review.createdAt)}
      </time>
    </div>
  );
}

function Likes({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 type-meta text-ink-muted tabular-nums">
      <Icon className="text-liked" icon="solar:heart-bold" size={13} />
      {formatCompact(count)}
    </span>
  );
}

function Lead({ review }: { review: HomeReview }): JSX.Element {
  const { author, film } = review;
  const still = tmdbImageUrl("backdrop", film.backdropPath, "w1280");

  return (
    <article className="flex min-w-0 flex-col gap-8">
      <HomePart name="cover">
        {still ? (
          <DockLink
            aria-label={film.title}
            className="cine-card relative block aspect-[16/9] overflow-hidden rounded-panel bg-plate"
            href={movieHref(film.id)}
            data-slot="frame"
          >
            <Image
              alt=""
              className="object-cover"
              sizes="(min-width: 1024px) 640px, 100vw"
              src={still}
              wrapperClassName="absolute inset-0"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-page/90 via-page/20 to-transparent"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
              <span className="flex min-w-0 flex-col gap-1">
                <span className={`${TONE.label} text-ink-body`}>Review of</span>
                <span className="truncate font-zuume type-display-xs leading-none font-bold text-ink uppercase sm:type-display-sm">
                  {film.title}
                </span>
              </span>
              {film.year ? (
                <span className="shrink-0 type-body text-ink-body tabular-nums">
                  {film.year}
                </span>
              ) : null}
            </span>
          </DockLink>
        ) : (
          <div className="flex items-end gap-5">
            <div className="w-24 shrink-0">
              <MoviePosterLink movie={film} radius={RADIUS.card} sizes="96px" />
            </div>
            <FilmTitle className="type-title" film={film} />
          </div>
        )}
      </HomePart>
      <blockquote className="flex flex-col gap-6">
        <HomeText
          as="p"
          className="line-clamp-8 max-w-[44ch] type-heading font-medium text-pretty text-ink sm:line-clamp-6"
          part="lead"
          text={`“${review.content}”`}
        />
        <HomePart
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
          name="byline"
        >
          <Byline review={review} />
          <Likes count={review.likes} />
          <DockLink
            className={`type-meta font-medium text-ink-body hover:text-ink ${TEXT_LINK_CLASS}`}
            href={reviewHref(film.id, author.username)}
          >
            Read review
          </DockLink>
        </HomePart>
      </blockquote>
    </article>
  );
}

function Brief({
  index,
  review,
}: {
  index: number;
  review: HomeReview;
}): JSX.Element {
  const { author, film } = review;
  const href = reviewHref(film.id, author.username);
  return (
    <HomePart as="li" className={REVIEW_ROW} index={index} name="review">
      <ReviewCard
        actions={
          <span className="flex items-center gap-5">
            <Likes count={review.likes} />
            <DockLink
              className={`type-meta font-medium text-ink-muted hover:text-ink ${TEXT_LINK_CLASS}`}
              href={href}
            >
              Read
            </DockLink>
          </span>
        }
        actionsInset={false}
        clamp
        content={review.content}
        date={review.createdAt}
        dateLabel={formatRelativeTime(review.createdAt)}
        href={movieHref(film.id)}
        lead={
          <MoviePosterLink movie={film} radius={RADIUS.tile} sizes="72px" />
        }
        meta={
          <>
            {film.year ? <ReviewMeta faint>{film.year}</ReviewMeta> : null}
            <MemberLink
              className="type-meta font-medium"
              member={author}
              size={16}
            />
          </>
        }
        rating={review.rating}
        title={film.title}
      />
    </HomePart>
  );
}

function pickLead(reviews: HomeReview[]): HomeReview {
  return (
    reviews.find(
      (review) =>
        review.film.backdropPath && review.content.length <= LEAD_REVIEW_LENGTH,
    ) ??
    reviews.find((review) => review.content.length <= LEAD_REVIEW_LENGTH) ??
    reviews[0]!
  );
}

export function HomeReviews({
  reviews,
}: {
  reviews: HomeReview[];
}): JSX.Element | null {
  if (reviews.length === 0) return null;
  const lead = pickLead(reviews);
  const rest = reviews.filter((review) => review !== lead).slice(0, 3);

  return (
    <HomeSection className="flex w-full flex-col" cue="reviews">
      <Heading title="Popular reviews" />
      <div className="grid grid-cols-1 gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Lead review={lead} />
        {rest.length > 0 ? (
          <ul className="flex flex-col">
            {rest.map((review, index) => (
              <Brief index={index} key={review.id} review={review} />
            ))}
          </ul>
        ) : null}
      </div>
    </HomeSection>
  );
}
