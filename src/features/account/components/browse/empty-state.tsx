import type { JSX } from "react";
import { Icon } from "@/ui";

export function EmptyState({
  children,
  icon = "solar:ghost-bold",
}: {
  children: string;
  icon?: string;
}): JSX.Element {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-sheet bg-fill p-8 text-center ring-1 ring-edge ring-inset">
      <div className="center size-12 rounded-full bg-fill text-ink-muted ring-1 ring-edge-hover ring-inset">
        <Icon icon={icon} size={24} />
      </div>
      <p className="max-w-xs text-xs text-ink-muted sm:text-sm">{children}</p>
    </div>
  );
}
