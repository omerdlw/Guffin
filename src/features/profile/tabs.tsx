"use client";

import type { JSX } from "react";
import { usePathname } from "next/navigation";
import { PageNav } from "@/design/components/page-nav";
import { Z_INDEX } from "@/design/foundations/z-index";
import { accountHref } from "@/shared/project";

const SECTIONS = [
  { key: "", label: "Overview" },
  { key: "activity", label: "Activity" },
  { key: "watched", label: "Films" },
  { key: "diary", label: "Diary" },
  { key: "reviews", label: "Reviews" },
  { key: "watchlist", label: "Watchlist" },
  { key: "lists", label: "Lists" },
  { key: "likes", label: "Likes" },
] as const;

export function ProfileTabs({ username }: { username: string }): JSX.Element {
  const pathname = usePathname();
  const base = accountHref(username);
  const current = decodeURIComponent(pathname)
    .slice(decodeURIComponent(base).length + 1)
    .split("/")[0];
  const items = SECTIONS.map((section) => ({
    current: section.key === current,
    href: section.key ? `${base}/${section.key}` : base,
    key: section.key || "profile",
    label: section.label,
  }));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 flex justify-center px-4 pt-fib-5 sm:px-6"
      data-part="tabs"
      style={{ zIndex: Z_INDEX.UI_ELEMENT }}
    >
      <PageNav
        className="pointer-events-auto"
        items={items}
        label="Profile sections"
      />
    </div>
  );
}
