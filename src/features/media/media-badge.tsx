import type { JSX } from "react";
import { Icon } from "@/design/components/icon";
import { cn } from "@/design/foundations/cn";
import { MEDIA_TYPE_COPY } from "./constants";
import type { MediaType } from "./types";

export function MediaBadge({
  className,
  mediaType,
}: {
  className?: string;
  mediaType: MediaType;
}): JSX.Element | null {
  if (mediaType !== "tv") return null;
  const copy = MEDIA_TYPE_COPY.tv;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-fill px-1.5 py-0.5 type-meta font-medium text-ink-muted ring-1 ring-edge ring-inset",
        className,
      )}
    >
      <Icon icon={copy.icon} size={11} />
      {copy.singular}
    </span>
  );
}
