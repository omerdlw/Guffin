"use client";

import { type CSSProperties, type FocusEvent, type JSX, useState } from "react";
import { Button } from "@/design/components/button";
import { cn } from "@/design/foundations/cn";
import { STAR_GAP, STAR_PATH } from "./constants";
import { isRated, starFillWidth } from "./utils";
import styles from "./rating.module.css";

export function Star({
  className,
  fill,
  size = 13,
}: {
  className?: string;
  fill: number;
  size?: number;
}): JSX.Element {
  const lit = fill >= 0.5;
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0", className)}
      style={{ height: size, width: size }}
    >
      <svg className="absolute inset-0 fill-fill-active" viewBox="0 0 24 24">
        <path d={STAR_PATH} />
      </svg>
      {lit ? (
        <svg
          className="absolute inset-0 fill-rated"
          style={fill >= 1 ? undefined : { clipPath: "inset(0 50% 0 0)" }}
          viewBox="0 0 24 24"
        >
          <path d={STAR_PATH} />
        </svg>
      ) : null}
    </span>
  );
}

export function RatingStars({
  className,
  rating,
  size = 13,
}: {
  className?: string;
  rating: number | null;
  size?: number;
}): JSX.Element {
  if (!isRated(rating)) {
    return (
      <span aria-label="No rating" className="text-ink-muted">
        —
      </span>
    );
  }

  const value = Math.min(5, Math.max(0, rating));
  const whole = Math.floor(value);
  const half = value - whole >= 0.5;
  const width = size * 5 + STAR_GAP * 4;
  const lit = whole * (size + STAR_GAP) + (half ? size / 2 : 0);
  const mask = { "--star-size": `${size}px` } as CSSProperties;
  const ink = size * 0.1425;

  return (
    <span
      aria-label={`${value} out of 5`}
      className={cn("relative inline-block shrink-0", className)}
      role="img"
      style={{
        height: size,
        marginInline: -ink,
        verticalAlign: `calc(0.355em - ${size / 2}px)`,
        width,
      }}
      title={`${value} out of 5`}
    >
      <span
        aria-hidden="true"
        className={cn(styles.stars, "absolute inset-0 bg-fill-active")}
        style={mask}
      />
      {lit > 0 ? (
        <span
          aria-hidden="true"
          className={cn(styles.stars, "absolute inset-0 bg-rated")}
          style={{ ...mask, clipPath: `inset(0 ${width - lit}px 0 0)` }}
        />
      ) : null}
    </span>
  );
}

export function RatingSelector({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: number | null) => void;
  value: number | null;
}): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  const choose = (score: number) => onChange(value === score ? null : score);
  const lightOnKeyboard = (event: FocusEvent<HTMLElement>, score: number) => {
    if (event.currentTarget.matches(":focus-visible")) setHover(score);
  };

  return (
    <div
      aria-label="Rating"
      className={cn("flex items-center gap-1.5", disabled && "opacity-50")}
      onMouseLeave={() => setHover(null)}
      role="group"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <div className="group/star relative size-10 sm:size-12" key={star}>
          <svg
            aria-hidden
            className="ui-glyph pointer-events-none absolute inset-0 size-full group-active/star:scale-95"
            viewBox="0 0 24 24"
          >
            <defs>
              <clipPath id={`rating-star-${star}`}>
                <rect
                  height="24"
                  style={{
                    transition: `width var(--step-0) var(--ease-out-cream) calc(var(--step-n6) * ${star - 1})`,
                    width: starFillWidth(star, shown),
                  }}
                  x="0"
                  y="0"
                />
              </clipPath>
            </defs>
            <path className="fill-fill-active" d={STAR_PATH} />
            <path
              className="fill-rated"
              clipPath={`url(#rating-star-${star})`}
              d={STAR_PATH}
            />
          </svg>
          <Button
            aria-label={`${star - 0.5} stars`}
            data-own-focus
            className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
            disabled={disabled}
            onClick={() => choose(star - 0.5)}
            onBlur={() => setHover(null)}
            onFocus={(event) => lightOnKeyboard(event, star - 0.5)}
            onMouseEnter={() => setHover(star - 0.5)}
          />
          <Button
            aria-label={`${star} stars`}
            data-own-focus
            className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
            disabled={disabled}
            onClick={() => choose(star)}
            onBlur={() => setHover(null)}
            onFocus={(event) => lightOnKeyboard(event, star)}
            onMouseEnter={() => setHover(star)}
          />
        </div>
      ))}
    </div>
  );
}
