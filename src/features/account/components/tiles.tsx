import type { ReactNode } from "react";
import { Image } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import {
  applyAvatarFallback,
  type AvatarSource,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from "../model";

export function AvatarTile({ children }: { children: ReactNode }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-fill">
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
    <Image
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
    <div className="flex min-h-44 w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <div className="center size-12 rounded-full bg-fill text-ink-muted ring-1 ring-edge ring-inset">
        <Icon icon={icon} size={22} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="type-body font-semibold text-ink">{title}</p>
        <p className="type-meta text-ink-muted text-balance">{description}</p>
      </div>
    </div>
  );
}
