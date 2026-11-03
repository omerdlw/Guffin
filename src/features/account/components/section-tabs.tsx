"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type MouseEvent,
} from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/ui/cn";
import { SlidingPill, useSlidingPill } from "@/ui";
import { AccountLink } from "./link";
import { accountHref } from "@/config/routes";

const SECTIONS = [
  { key: null, label: "Profile" },
  { key: "activity", label: "Activity" },
  { key: "watched", label: "Films" },
  { key: "diary", label: "Diary" },
  { key: "reviews", label: "Reviews" },
  { key: "watchlist", label: "Watchlist" },
  { key: "lists", label: "Lists" },
  { key: "likes", label: "Likes" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function AccountSectionTabs({
  username,
}: {
  username: string;
}): JSX.Element {
  const active = useSelectedLayoutSegment() as SectionKey;
  const base = accountHref(username);
  const [chosen, setChosen] = useState<SectionKey>(active);
  const [prevActive, setPrevActive] = useState<SectionKey>(active);
  if (active !== prevActive) {
    setPrevActive(active);
    setChosen(active);
  }

  const { box: pill, ref: listRef } = useSlidingPill<HTMLUListElement>(
    "[data-chosen]",
    chosen,
  );

  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>("[data-chosen]");
    if (!nav || !list || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft =
      list.offsetLeft +
      current.offsetLeft -
      (nav.clientWidth - current.offsetWidth) / 2;
  }, [active, listRef]);

  const choose = (key: SectionKey) => (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
      return;
    setChosen(key);
  };

  return (
    <nav
      aria-label="Profile sections"
      className="flex w-full overflow-x-auto px-4 pt-4 pb-6 [scrollbar-width:none] sm:px-6 sm:pt-5"
      ref={navRef}
    >
      <ul
        className="relative mx-auto flex h-10 w-max shrink-0 items-stretch gap-0.5 rounded-full bg-black/60 p-1 ring-1 ring-edge-hover in-data-backdrop:backdrop-blur-xl in-data-backdrop:backdrop-saturate-150 ring-inset select-none"
        ref={listRef}
      >
        {pill ? (
          <SlidingPill
            box={pill}
            className="inset-y-1 rounded-full bg-grade/15"
          />
        ) : null}
        {SECTIONS.map((section) => {
          const isChosen = section.key === chosen;
          return (
            <li
              className="flex"
              data-chosen={isChosen ? "" : undefined}
              key={section.label}
              onClick={choose(section.key)}
            >
              <AccountLink
                aria-current={section.key === active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center rounded-full px-4 type-control font-medium whitespace-nowrap",
                  isChosen
                    ? "text-ink"
                    : "text-ink-body hover:text-ink focus-visible:text-ink",
                  isChosen && !pill && "bg-grade/15",
                )}
                href={section.key ? `${base}/${section.key}` : base}
              >
                {section.label}
              </AccountLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
