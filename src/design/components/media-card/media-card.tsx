"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../foundations/cn";
import { DockLink } from "../link";
import { Image } from "../image";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";
import {
  mediaCardVariants,
  type MediaCardVariants,
  mediaFrameVariants,
} from "./variants";

export type MediaCardAspect = NonNullable<MediaCardVariants["aspect"]>;

export interface MediaCardImage {
  crossOrigin?: "anonymous";
  priority?: boolean;
  sizes?: string;
  src: string | null;
  srcSet?: string;
}

type DataAttributes = { [key: `data-${string}`]: string | undefined };

export interface MediaCardProps extends DataAttributes {
  aspect?: MediaCardAspect;
  caption?: ReactNode;
  className?: string;
  fallbackIcon?: string;
  fallbackIconSize?: number;
  frameClassName?: string;
  framed?: boolean;
  href?: string;
  image: MediaCardImage;
  label?: string;
  onNavigated?: () => void;
  onClick?: () => void;
  overlay?: ReactNode;
  radius?: number | string;
  tooltip?: string;
}

export function MediaCard({
  aspect = "poster",
  caption,
  className,
  fallbackIcon = "solar:gallery-bold",
  fallbackIconSize = 22,
  frameClassName,
  framed = true,
  href,
  image,
  label,
  onClick,
  onNavigated,
  overlay,
  radius,
  tooltip,
  ...rest
}: MediaCardProps) {
  const style: CSSProperties = { borderRadius: radius };
  const classes = cn(mediaCardVariants({ aspect }), className);

  const body = (
    <>
      <div
        className={cn(mediaFrameVariants({ aspect, framed }), frameClassName)}
        data-cursor-frame=""
        style={style}
      >
        <Image
          alt=""
          className="cine-zoom object-cover"
          crossOrigin={image.crossOrigin}
          fallback={
            <div className="center h-full w-full text-ink-faint">
              <Icon icon={fallbackIcon} size={fallbackIconSize} />
            </div>
          }
          fetchPriority={image.priority ? "high" : undefined}
          loading={image.priority ? "eager" : undefined}
          sizes={image.sizes}
          src={image.src}
          srcSet={image.srcSet}
        />
        {overlay}
        {framed ? (
          <>
            <span aria-hidden="true" className="cine-afterglow" />
            <span
              aria-hidden="true"
              className="cine-fade pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-edge ring-inset group-focus-visible/media:ring-edge-focus in-data-active:ring-edge-focus"
            />
          </>
        ) : null}
      </div>
      {caption}
    </>
  );

  let card: ReactNode;
  if (href) {
    card = (
      <DockLink
        {...rest}
        aria-label={label}
        className={classes}
        data-cursor="card"
        data-cursor-label={tooltip}
        href={href}
        onNavigated={onNavigated}
        style={style}
      >
        {body}
      </DockLink>
    );
  } else if (onClick) {
    card = (
      <button
        {...rest}
        aria-label={label}
        className={cn(classes, "cursor-pointer text-left")}
        data-cursor="card"
        data-cursor-label={tooltip}
        onClick={onClick}
        style={style}
        type="button"
      >
        {body}
      </button>
    );
  } else {
    card = (
      <div className={classes} style={style}>
        {body}
      </div>
    );
  }

  return tooltip ? (
    <Tooltip data-cursor-owned="" position="top" text={tooltip}>
      {card}
    </Tooltip>
  ) : (
    card
  );
}
