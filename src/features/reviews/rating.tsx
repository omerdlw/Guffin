"use client";

import { type CSSProperties, type FocusEvent, type JSX, useState } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { cn } from "@/design/ui";
import styles from "./rating.module.css";
import { isRated } from "./review";

const STAR_PATH =
  "M12.74 3.98 L14.26 8.05 Q14.47 8.60 15.06 8.63 L19.40 8.82 Q21.51 8.91 19.85 10.23 L16.45 12.93 Q15.99 13.30 16.15 13.87 L17.31 18.05 Q17.88 20.09 16.12 18.92 L12.49 16.53 Q12 16.20 11.51 16.53 L7.88 18.92 Q6.12 20.09 6.69 18.05 L7.85 13.87 Q8.01 13.30 7.55 12.93 L4.15 10.23 Q2.49 8.91 4.60 8.82 L8.94 8.63 Q9.53 8.60 9.74 8.05 L11.26 3.98 Q12 2 12.74 3.98Z";

const STAR_GAP = 2;

function starFillWidth(star: number, value: number | null): number {
  if (value === null) return 0;
  if (value >= star) return 24;
  if (value >= star - 0.5) return 12;
  return 0;
}

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
