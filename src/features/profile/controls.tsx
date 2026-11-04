"use client";

import {
  type JSX,
  type MouseEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  useSelectedLayoutSegment,
} from "next/navigation";
import {
  setFavoriteAction,
  setMovieLibraryAction,
} from "@/features/account/actions";
import { setMovieListMembershipAction } from "@/features/lists/actions";
import { accountHref } from "@/lib/project";
import { AccountLink, Button, useConfirmedAction } from "@/ui/button";
import { cn } from "@/ui/cn";
import {
  HighlightGroup,
  SlidingPill,
  useHighlight,
  useSlidingPill,
} from "@/ui/form";
import { Icon } from "@/ui/media";
import {
  LIBRARY_KIND_BY_SOURCE,
  PAGE_CURRENT_CLASS,
  PAGE_IDLE_CLASS,
  PAGE_STEP_CLASS,
  SECTION_TABS,
  TILE_ACTION_LABELS,
} from "./constants";
import type { SectionKey, TileSource } from "./types";
import { pageWindow } from "./utils";

function PageLink({
  ariaLabel,
  children,
  current = false,
  href,
  id,
  tone,
}: {
  ariaLabel?: string;
  children: ReactNode;
  current?: boolean;
  href: string;
  id: string;
  tone: string;
}): JSX.Element {
  const highlight = useHighlight(id, "rounded-full bg-fill");

  return (
    <AccountLink
      aria-current={current ? "page" : undefined}
      aria-label={ariaLabel}
      className={cn(PAGE_STEP_CLASS, tone, "relative isolate")}
      href={href}
      {...highlight.props}
    >
      {highlight.node}
      <span className="relative z-10">{children}</span>
    </AccountLink>
  );
}

export function Pagination({
  page,
  pageCount,
}: {
  page: number;
  pageCount: number;
}): JSX.Element | null {
  const pathname = usePathname();
  const search = useSearchParams();
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(search.toString());
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <HighlightGroup>
      <nav
        aria-label="Pages"
        className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
      >
        {page > 1 ? (
          <PageLink
            ariaLabel="Previous page"
            href={hrefFor(page - 1)}
            id="previous"
            tone={PAGE_IDLE_CLASS}
          >
            <Icon icon="solar:alt-arrow-left-linear" size={14} />
          </PageLink>
        ) : null}
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <span className="px-1 text-ink-faint" key={`gap-${index}`}>
              …
            </span>
          ) : (
            <PageLink
              current={entry === page}
              href={hrefFor(entry)}
              id={`page-${entry}`}
              key={`page-${entry}`}
              tone={entry === page ? PAGE_CURRENT_CLASS : PAGE_IDLE_CLASS}
            >
              {entry}
            </PageLink>
          ),
        )}
        {page < pageCount ? (
          <PageLink
            ariaLabel="Next page"
            href={hrefFor(page + 1)}
            id="next"
            tone={PAGE_IDLE_CLASS}
          >
            <Icon icon="solar:alt-arrow-right-linear" size={14} />
          </PageLink>
        ) : null}
      </nav>
    </HighlightGroup>
  );
}

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
        {SECTION_TABS.map((section) => {
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

export function TileActions({
  pinned = false,
  source,
  title,
  tmdbId,
}: {
  pinned?: boolean;
  source: TileSource;
  title: string;
  tmdbId: number;
}): JSX.Element {
  const router = useRouter();
  const { busy, confirming, confirmThen, run } = useConfirmedAction({
    fallback: "Something went wrong",
    name: "TileActions",
    onSuccess: () => router.refresh(),
  });

  const remove = () =>
    confirmThen(() =>
      source.kind === "list"
        ? setMovieListMembershipAction(tmdbId, source.listId, false)
        : setMovieLibraryAction(
            tmdbId,
            LIBRARY_KIND_BY_SOURCE[source.kind],
            false,
          ),
    );

  const button =
    "center size-8 cursor-pointer rounded-thumb bg-black/60 text-ink-body ring-1 ring-edge-hover backdrop-blur-sm ring-inset hover:bg-black/70 focus-visible:bg-black/70 hover:text-ink focus-visible:text-ink disabled:cursor-wait";

  return (
    <div
      className={cn(
        "absolute top-2 right-2 z-10 flex gap-1.5 ui-fade",
        confirming || busy
          ? "opacity-100"
          : "opacity-0 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100",
      )}
    >
      {source.kind === "likes" ? (
        <Button
          aria-label={pinned ? `Unpin ${title}` : `Pin ${title} to favorites`}
          aria-pressed={pinned}
          className={cn(button, pinned && "text-rated")}
          disabled={busy}
          loading={busy && !confirming}
          onClick={() => run(() => setFavoriteAction(tmdbId, !pinned))}
        >
          <Icon
            icon={pinned ? "solar:star-bold" : "solar:star-linear"}
            size={15}
          />
        </Button>
      ) : null}
      <Button
        aria-label={
          confirming
            ? `Confirm removing ${title}`
            : `Remove ${title} from ${TILE_ACTION_LABELS[source.kind]}`
        }
        className={cn(button, confirming && "bg-danger text-black ring-danger")}
        disabled={busy}
        loading={busy && confirming}
        onClick={remove}
      >
        <Icon
          icon={
            confirming
              ? "solar:check-read-linear"
              : "solar:trash-bin-trash-bold"
          }
          size={15}
        />
      </Button>
    </div>
  );
}
