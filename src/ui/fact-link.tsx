"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDockLinkClick } from "./hooks/use-dock-link";

export function FactLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}) {
  const handleClick = useDockLinkClick(href);
  return (
    <Link
      aria-label={label}
      className="cine-fade border-b border-ink-faint outline-none hover:border-ink-muted focus-visible:border-ink-muted"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
