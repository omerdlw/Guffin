"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { AccountLink } from "@/features/account";
import {
  RatingStars,
  ReviewActions,
  ReviewBody,
  createReviewEditorSurfaceEntry,
  Star,
  type MovieReview,
} from "@/features/reviews";
import { Avatar, Icon, TONE } from "@/ui";
import { DetailPart } from "@/features/detail";
import { accountHref } from "@/config/routes";

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// The stars of a review light one after another once its card is in, each a
// step of the card's place on the list, so the lights run down the list too.
const LIGHTS = 6;

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
  if (rating === null || !Number.isFinite(rating) || rating <= 0) {
    return <RatingStars rating={rating} />;
  }
  const value = Math.min(5, Math.max(0, rating));
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

export function ReviewCard({
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
  const first = index * LIGHTS;
  const router = useRouter();
  const { openSurface } = useDockActions();
  const profile = accountHref(review.author.username);
  const hasRating =
    review.rating !== null &&
    Number.isFinite(review.rating) &&
    review.rating > 0;

  return (
    <DetailPart
      as="li"
      className="flex py-6 first:pt-0 last:pb-0"
      index={index}
      name="review"
    >
      <article className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-start gap-x-3.5 gap-y-3">
        <AccountLink className="flex shrink-0 self-start" href={profile}>
          <Avatar
            className="rounded-full"
            name={review.author.displayName}
            size={44}
            src={review.author.avatarUrl ?? undefined}
          />
        </AccountLink>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <AccountLink
              className="block truncate type-base font-semibold text-ink underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:decoration-current"
              href={profile}
            >
              {review.author.displayName}
            </AccountLink>
            <time
              className="type-meta font-semibold text-ink-muted"
              dateTime={review.updatedAt}
            >
              {DATE.format(new Date(review.updatedAt))}
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
              revealClassName={`rounded-full ${TONE.surface}`}
            />
          </div>
        ) : null}
      </article>
    </DetailPart>
  );
}
