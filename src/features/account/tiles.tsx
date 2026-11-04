import type { ReactNode } from "react";
import { AdaptiveImage, Icon } from "@/ui/media";
import {
  SURFACE_META,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
} from "@/ui/tokens";
import type { AvatarSource } from "./types";
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "./utils";

export function AvatarTile({ children }: { children: ReactNode }) {
  return (
    <div
      className={`relative size-10 shrink-0 overflow-hidden bg-fill ${SURFACE_TILE_INNER}`}
    >
      {children}
    </div>
  );
}

export function AccountAvatarImage({
  account,
  alt,
}: {
  account: AvatarSource;
  alt: string;
}) {
  return (
    <AdaptiveImage
      alt={alt}
      className="size-full rounded-[inherit] object-cover"
      onError={(event) =>
        applyAvatarFallback(event, getUserAvatarFallbackUrl(account))
      }
      src={getUserAvatarUrl(account)}
      wrapperClassName="size-full rounded-[inherit]"
    />
  );
}

export function StatusTile({
  description,
  icon,
  title,
}: {
  description: string;
  icon: string;
  title: string;
}) {
  return (
    <div className={`${SURFACE_TILE} w-full`}>
      <div
        className={`center size-10 shrink-0 bg-fill text-ink-muted ${SURFACE_TILE_INNER}`}
      >
        <Icon icon={icon} size={20} />
      </div>
      <div className={SURFACE_TEXT}>
        <p className={SURFACE_TITLE}>{title}</p>
        <p className={SURFACE_META}>{description}</p>
      </div>
    </div>
  );
}
