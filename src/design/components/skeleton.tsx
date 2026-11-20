import type { CSSProperties, JSX, ReactNode } from "react";
import { BUTTON_SIZES } from "@/design/recipes";
import { cn, ui } from "@/design/ui";

export const SKELETON = {
  block: ui.parts.skeleton.block({ tone: "block" }),
  pulse: "ui-pulse",
  soft: ui.parts.skeleton.block({ tone: "soft" }),
  solid: ui.parts.skeleton.block({ tone: "solid" }),
} as const;

export function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(SKELETON.block, className)}
      style={style}
    />
  );
}

export function SkeletonLines({
  className,
  height = "0.62em",
  phone,
  widths,
}: {
  className?: string;
  height?: string;
  phone?: readonly string[];
  widths: readonly string[];
}): JSX.Element {
  if (phone) {
    return (
      <>
        <SkeletonLines
          className={cn(className, "sm:hidden")}
          height={height}
          widths={phone}
        />
        <SkeletonLines
          className={cn(className, "hidden sm:block")}
          height={height}
          widths={widths}
        />
      </>
    );
  }

  return (
    <div aria-hidden="true" className={className}>
      {widths.map((width, index) => (
        <div className={ui.parts.skeleton.line()} key={index}>
          <SkeletonBlock className="rounded-full" style={{ height, width }} />
        </div>
      ))}
    </div>
  );
}

export const skeletonTextWidth = (text: string) =>
  `${(text.length * 8.2) / 16}rem`;

export function SkeletonText({
  as: Tag = "span",
  className,
  text,
}: {
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  text: ReactNode;
}): JSX.Element {
  return (
    <Tag aria-hidden="true" className={className}>
      <span className="ui-skeleton-text">{text}</span>
    </Tag>
  );
}

export function SkeletonButton({
  className,
  icon = false,
  label,
  shape = "pill",
  size = "md",
}: {
  className?: string;
  icon?: boolean | number;
  label?: string;
  shape?: "card" | "pill" | "thumb";
  size?: keyof typeof BUTTON_SIZES;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        SKELETON.block,
        BUTTON_SIZES[size],
        BUTTON_SHAPES[shape],
        "inline-flex shrink-0 items-center justify-center font-medium text-transparent select-none",
        !label && `aspect-square px-0`,
        className,
      )}
    >
      {icon === true ? <span className="size-4 shrink-0" /> : null}
      {typeof icon === "number" ? (
        <span className="shrink-0" style={{ height: icon, width: icon }} />
      ) : null}
      {label}
    </span>
  );
}

const BUTTON_SHAPES = {
  card: "rounded-card",
  pill: "rounded-full",
  thumb: "rounded-thumb",
} as const;

export function SegmentedSkeleton({
  chosen = 0,
  className,
  labels,
  size = "sm",
}: {
  chosen?: number;
  className?: string;
  labels: readonly string[];
  size?: "md" | "sm";
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        SKELETON.soft,
        "inline-flex w-fit max-w-full shrink-0 items-stretch gap-0.5 rounded-full p-0.5 select-none",
        size === "sm" ? "h-control-sm" : "h-control-md",
        className,
      )}
    >
      {labels.map((label, index) => (
        <span
          className={cn(
            "inline-flex min-w-fit items-center justify-center rounded-full font-semibold whitespace-nowrap text-transparent",
            size === "sm" ? "px-3.5 type-meta" : "px-4 type-control",
            index === chosen && SKELETON.block,
          )}
          key={label}
        >
          {label}
        </span>
      ))}
    </span>
  );
}
