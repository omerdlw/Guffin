"use client";

import { type JSX, useState } from "react";
import { formatShortDate } from "@/features/account/utils";
import { ReviewActions } from "@/features/reviews/controls";
import { RatingStars } from "@/features/reviews/rating";
import { movieHref, reviewHref } from "@/lib/project";
import { AccountLink, Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { MediaCard } from "@/ui/media";
import { RADIUS } from "@/ui/tokens";
import { AccountPart } from "./motion";
import type { ActivityReview } from "./types";
import { posterImage } from "./utils";

function ReviewText({ review }: { review: ActivityReview }) {
  const [revealed, setRevealed] = useState(false);
  if (!review.content.trim()) return null;
  if (review.isSpoiler && !revealed) {
    return (
      <p className="type-body leading-6 text-ink-muted italic">
        This review may contain spoilers.{" "}
        <Button
          className="cursor-pointer font-medium text-ink-body not-italic underline-offset-2 hover:text-ink focus-visible:text-ink underline decoration-transparent hover:decoration-current focus-visible:decoration-current"
          onClick={() => setRevealed(true)}
          type="button"
        >
          Show it anyway
        </Button>
      </p>
    );
  }
  return (
    <p className="line-clamp-6 type-body leading-6 whitespace-pre-line text-pretty text-ink-body">
      {review.content}
    </p>
  );
}

function ReviewRow({
  index,
  isOwner,
  review,
  signedIn,
  staged,
  username,
}: {
  index: number;
  isOwner: boolean;
  review: ActivityReview;
  signedIn: boolean;
  staged: boolean;
  username: string;
}) {
  const href = movieHref(review.tmdbId);
  const body = (
    <>
      <MediaCard
        aspect="free"
        className="w-14 shrink-0 sm:w-[4.5rem]"
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={16}
        frameClassName="aspect-[2/3] w-full"
        href={href}
        image={posterImage(review.posterPath, "72px")}
        label={review.year ? `${review.title} (${review.year})` : review.title}
        radius={RADIUS.tile}
      />
      <article className="flex min-w-0 flex-1 flex-col">
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <AccountLink
            className="type-base font-semibold text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current sm:type-title"
            href={href}
          >
            {review.title}
          </AccountLink>
          {review.year ? (
            <span className="type-body text-ink-muted tabular-nums">
              {review.year}
            </span>
          ) : null}
        </h3>
        <p className="mt-1 flex items-center gap-3 type-meta text-ink-muted">
          {review.rating ? (
            <RatingStars rating={review.rating} size={12} />
          ) : null}
          <AccountLink
            aria-label={`Read this review of ${review.title} on its page`}
            className="hover:text-ink focus-visible:text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
            href={reviewHref(review.tmdbId, username)}
          >
            <time dateTime={review.updatedAt}>
              {formatShortDate(review.updatedAt)}
            </time>
          </AccountLink>
        </p>
        {review.content.trim() ? (
          <div className="mt-3">
            <ReviewText review={review} />
          </div>
        ) : null}
        <footer className="mt-2 -ml-2 flex items-center">
          <ReviewActions
            id={review.id}
            isOwner={isOwner}
            liked={review.liked}
            likesCount={review.likesCount}
            signedIn={signedIn}
          />
        </footer>
      </article>
    </>
  );
  const className = "flex gap-4 py-6 first:pt-0 last:pb-0 sm:gap-5";
  return staged ? (
    <AccountPart as="li" className={className} index={index} name="row">
      {body}
    </AccountPart>
  ) : (
    <li className={className}>{body}</li>
  );
}

export function ReviewList({
  className,
  isOwner,
  reviews,
  signedIn,
  staged = false,
  username,
}: {
  className?: string;
  isOwner: boolean;
  reviews: readonly ActivityReview[];
  signedIn: boolean;
  staged?: boolean;
  username: string;
}): JSX.Element {
  return (
    <ul className={cn("flex flex-col divide-y divide-rule", className)}>
      {reviews.map((review, index) => (
        <ReviewRow
          index={index}
          isOwner={isOwner}
          key={review.id}
          review={review}
          signedIn={signedIn}
          staged={staged}
          username={username}
        />
      ))}
    </ul>
  );
}
