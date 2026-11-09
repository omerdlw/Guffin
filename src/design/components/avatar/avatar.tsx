"use client";

import { type HTMLAttributes, type ReactNode, type Ref, useState } from "react";
import { cn } from "../../foundations/cn";
import { Image } from "../image";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  alt?: string;
  fallback?: ReactNode;
  name?: string;
  ref?: Ref<HTMLSpanElement>;
  size?: number | string;
  src?: string | null;
}

function initialsOf(name?: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** A round portrait, or the initials of `name` when there is none. */
export function Avatar({
  alt,
  children,
  className,
  fallback,
  name,
  ref,
  size = 36,
  src,
  style,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      ref={ref}
      style={{ height: dimension, width: dimension, ...style }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-fill-hover text-ink-body select-none",
        className,
      )}
      {...props}
    >
      {src && src !== failedSrc ? (
        <Image
          src={src}
          alt={alt || name || "Avatar"}
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center type-meta font-medium uppercase">
          {fallback ?? children ?? initialsOf(name || alt)}
        </span>
      )}
    </span>
  );
}
