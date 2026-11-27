"use client";

import { type JSX, type ReactNode, useState } from "react";
import { DockLink } from "@/design/components/link";
import { cn } from "@/design/ui";
import { formatShortDate } from "@/features/account/model";
import { isRated } from "../model";
import { RatingStars } from "./rating";

export const REVIEW_ROW =
  "border-t border-rule py-fib-4 first:border-t-0 first:pt-0";

const TITLE =
  "type-base font-medium text-ink underline decoration-transparent underline-offset-2 hover:decoration-current";

function ReviewText({
  clamp,
  content,
  isSpoiler,
}: {
  clamp: boolean;
  content: string;
  isSpoiler: boolean;
}): JSX.Element {
  const [revealed, setRevealed] = useState(!isSpoiler);
  if (!revealed) {
    return (
      <p className="type-body text-ink-muted italic">
        This review may contain spoilers.{" "}
        <button
          className="font-medium text-ink-body not-italic hover:text-ink"
          onClick={() => setRevealed(true)}
          type="button"
        >
          Show it anyway
        </button>
      </p>
    );
  }
  if (clamp) {
    return (
      <p className="line-clamp-4 max-w-[65ch] type-body leading-6 text-pretty text-ink-body">
        {content}
      </p>
    );
  }
  return (
    <div className="flex max-w-[65ch] flex-col gap-fib-3">
      {content
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => (
          <p
            className="type-body leading-6 text-pretty text-ink-body"
            key={index}
          >
            {line}
          </p>
        ))}
    </div>
  );
}

export function ReviewCard({
  actions,
  actionsInset = true,
  clamp = false,
  content,
  date,
  dateLabel,
  href,
  isSpoiler = false,
  lead,
  leadShape = "poster",
  marks,
  meta,
  rating,
  stars,
  title,
}: {
  actions?: ReactNode;
  actionsInset?: boolean;
  clamp?: boolean;
  content: string;
  date: string;
  dateLabel?: string;
  href: string;
  isSpoiler?: boolean;
  lead: ReactNode;
  leadShape?: "avatar" | "poster";
  marks?: ReactNode;
  meta?: ReactNode;
  rating: number | null;
  stars?: ReactNode;
  title: string;
}): JSX.Element {
  const scored =
    stars ??
    (isRated(rating) ? (
      <RatingStars className="shrink-0" rating={rating} size={14} />
    ) : null);

  return (
    <article className="flex min-w-0 gap-fib-3 sm:gap-fib-4" data-kind="review">
      <div
        className={cn(
          "flex shrink-0 self-start",
          leadShape === "poster" ? "w-14 sm:w-[4.5rem]" : "w-11",
        )}
      >
        {lead}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-fib-3">
        <header className="flex min-w-0 flex-wrap items-center gap-x-fib-2 gap-y-1">
          {scored || marks ? (
            <span className="flex shrink-0 items-center gap-fib-2">
              {scored}
              {marks}
            </span>
          ) : null}
          <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-fib-2">
            <DockLink className={TITLE} href={href}>
              {title}
            </DockLink>
            {meta}
          </h3>
          <time
            className="type-meta text-ink-faint tabular-nums"
            dateTime={date}
          >
            {dateLabel ?? formatShortDate(date)}
          </time>
        </header>
        {content ? (
          <ReviewText clamp={clamp} content={content} isSpoiler={isSpoiler} />
        ) : null}
        {actions ? (
          <footer className={cn(actionsInset && "-mb-2 -ml-2")}>
            {actions}
          </footer>
        ) : null}
      </div>
    </article>
  );
}

export function ReviewMeta({
  children,
  faint = false,
}: {
  children: ReactNode;
  faint?: boolean;
}): JSX.Element {
  return (
    <span
      className={cn(
        faint
          ? "type-meta text-ink-faint tabular-nums"
          : "type-body font-medium text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}
