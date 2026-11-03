"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useDockLinkClick } from "./hooks/use-dock-link";

export function ResultRow({
  href,
  label,
  meta,
  onNavigated,
  thumb,
  title,
}: {
  href: string;
  label: string;
  meta: ReactNode;
  onNavigated?: () => void;
  thumb: ReactNode;
  title: ReactNode;
}) {
  const handleClick = useDockLinkClick(href, onNavigated);

  return (
    <Link
      aria-label={label}
      className="cine-fade group relative z-10 flex h-16 items-center gap-3 rounded-card p-2 pr-4 outline-none focus-visible:bg-fill-hover"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <span className="ui-glyph center w-8 shrink-0 in-data-active:scale-[1.08]">
        {thumb}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate type-body font-semibold text-ink">
          {title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 type-meta text-ink-muted group-hover:text-ink-body group-focus-visible:text-ink-body group-has-focus-visible:text-ink-body in-data-active:text-ink-body">
          {meta}
        </span>
      </span>
    </Link>
  );
}
