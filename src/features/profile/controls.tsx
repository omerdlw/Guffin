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
  Button,
  HighlightGroup,
  SlidingPill,
  useHighlight,
  useSlidingPill,
} from "@omerdlw/base-framework/ui";
import {
  usePathname,
  useRouter,
  useSearchParams,
  useSelectedLayoutSegment,
} from "next/navigation";
import { useConfirmedAction } from "@/design/components/confirm";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { cn } from "@/design/ui";
import {
  setFavoriteAction,
  setMovieLibraryAction,
} from "@/features/account/actions";
import type { MediaType } from "@/features/catalog/types";
import { setMovieListMembershipAction } from "@/features/lists/actions";
import { MediaTypeSwitch, useVitrin } from "@/features/media/media-type";
import { MEDIA_TYPE_COPY, withVitrin } from "@/features/media/vitrin";
import { TV_ENABLED } from "@/lib/env";
import { accountHref } from "@/lib/project";
import {
  LIBRARY_KIND_BY_SOURCE,
  PAGE_CURRENT_CLASS,
  PAGE_IDLE_CLASS,
  PAGE_STEP_CLASS,
  SECTION_TABS,
  TILE_ACTION_LABELS,
  TV_SECTION_TABS,
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
    <DockLink
      aria-current={current ? "page" : undefined}
      aria-label={ariaLabel}
      className={cn(PAGE_STEP_CLASS, tone, "relative isolate")}
      href={href}
      {...highlight.props}
    >
      {highlight.node}
      <span className="relative z-10">{children}</span>
    </DockLink>
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

function spanOf(index: number, count: number): number {
  const first = Math.ceil(count / 2);
  return Math.floor(60 / (index < first ? first : count - first));
}

export function AccountSectionTabs({
  rememberedVitrin,
  username,
}: {
  rememberedVitrin: MediaType;
  username: string;
}): JSX.Element {
  const active = useSelectedLayoutSegment() as SectionKey;
  const base = accountHref(username);
  const {
    asked,
    choose: chooseVitrin,
    value: vitrin,
  } = useVitrin(rememberedVitrin);
  const [chosen, setChosen] = useState<SectionKey>(active);
  const [prevActive, setPrevActive] = useState<SectionKey>(active);
  if (active !== prevActive) {
    setPrevActive(active);
    setChosen(active);
  }

  const { box: pill, ref: listRef } = useSlidingPill<HTMLUListElement>(
    "[data-chosen]",
    chosen,
    { wrapping: true },
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

  const tabs = SECTION_TABS.filter(
    (section) =>
      !section.key ||
      !TV_SECTION_TABS.has(section.key) ||
      (TV_ENABLED && vitrin === "tv"),
  );
  const hrefFor = (key: SectionKey) => {
    const path = key ? `${base}/${key}` : base;
    if (!TV_ENABLED) return path;
    return vitrin === "movie" && asked === "movie"
      ? `${path}?v=movie`
      : withVitrin(path, vitrin);
  };
  const switchVitrin = (next: MediaType) =>
    chooseVitrin(
      next,
      next === "movie" && active && TV_SECTION_TABS.has(active)
        ? base
        : undefined,
    );

  return (
    <div className="flex w-full items-stretch justify-center gap-2 px-4 pt-4 pb-6 sm:px-6 sm:pt-5 lg:items-center">
      {TV_ENABLED ? (
        <MediaTypeSwitch onChange={switchVitrin} value={vitrin} />
      ) : null}
      <nav
        aria-label="Profile sections"
        className="relative flex min-w-0 flex-1 lg:max-w-full lg:flex-none lg:overflow-x-auto lg:[scrollbar-width:none]"
        ref={navRef}
      >
        <ul
          className="relative grid w-full grid-cols-60 items-stretch gap-y-0.5 rounded-panel bg-veil p-1 lg:flex lg:h-10 lg:w-max lg:shrink-0 lg:gap-0.5 lg:rounded-full ring-1 ring-edge-hover in-data-backdrop:backdrop-saturate-150 ring-inset select-none"
          ref={listRef}
        >
          {pill ? (
            <SlidingPill box={pill} className="rounded-full bg-grade/15" />
          ) : null}
          {tabs.map((section, index) => {
            const isChosen = section.key === chosen;
            const label =
              section.key === "watched"
                ? MEDIA_TYPE_COPY[vitrin].label
                : section.label;
            return (
              <li
                className="flex h-8 lg:flex-none"
                data-chosen={isChosen ? "" : undefined}
                key={section.key ?? "profile"}
                onClick={choose(section.key)}
                style={{ gridColumn: `span ${spanOf(index, tabs.length)}` }}
              >
                <DockLink
                  aria-current={section.key === active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex flex-1 items-center justify-center rounded-full px-1 type-meta sm:px-4 sm:type-control font-medium whitespace-nowrap",
                    isChosen
                      ? "text-ink"
                      : "text-ink-body hover:text-ink focus-visible:text-ink",
                    isChosen && !pill && "bg-grade/15",
                  )}
                  href={hrefFor(section.key)}
                >
                  {label}
                </DockLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
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
  const { busy, confirmThen, run } = useConfirmedAction({
    fallback: "Something went wrong",
    name: "TileActions",
    onSuccess: () => router.refresh(),
  });

  const mediaType = source.mediaType ?? "movie";
  const remove = () =>
    void confirmThen(
      {
        action: "Remove",
        description: `It leaves your ${TILE_ACTION_LABELS[source.kind]}`,
        title: `Remove ${title}?`,
      },
      () =>
        source.kind === "list"
          ? setMovieListMembershipAction(
              tmdbId,
              source.listId,
              false,
              mediaType,
            )
          : setMovieLibraryAction(
              tmdbId,
              LIBRARY_KIND_BY_SOURCE[source.kind],
              false,
              mediaType,
            ),
    );

  return (
    <div
      className={cn(
        "absolute top-2 right-2 z-10 flex gap-1.5 ui-fade",
        busy
          ? "opacity-100"
          : "opacity-0 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100",
      )}
    >
      {source.kind === "likes" ? (
        <Button
          aria-label={pinned ? `Unpin ${title}` : `Pin ${title} to favorites`}
          aria-pressed={pinned}
          className={cn(pinned && "text-rated")}
          icon
          intent="glass"
          shape="thumb"
          size="sm"
          disabled={busy}
          loading={busy}
          onClick={() =>
            run(() => setFavoriteAction(tmdbId, !pinned, mediaType))
          }
        >
          <Icon
            icon={pinned ? "solar:star-bold" : "solar:star-linear"}
            size={15}
          />
        </Button>
      ) : null}
      <Button
        aria-label={`Remove ${title} from ${TILE_ACTION_LABELS[source.kind]}`}
        icon
        intent="glass"
        shape="thumb"
        size="sm"
        disabled={busy}
        onClick={remove}
      >
        <Icon icon="solar:trash-bin-trash-bold" size={15} />
      </Button>
    </div>
  );
}
