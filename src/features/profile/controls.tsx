"use client";

import {
  type JSX,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { LayoutGroup } from "motion/react";
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
import { AccountLink, Button, useConfirmStep } from "@/ui/button";
import { cn } from "@/ui/cn";
import {
  Input,
  Select,
  SlidingHighlight,
  SlidingPill,
  useSlidingPill,
} from "@/ui/form";
import { Icon } from "@/ui/media";
import {
  ANY_OPTION,
  FILTER_BAR_LOOK,
  SEARCH_SETTLE_MS,
  SECTION_TABS,
  TILE_ACTION_LABELS,
} from "./constants";
import type { FilterField, SectionKey, TileSource } from "./types";
import { pageWindow } from "./utils";

function useFilterAddress(fields: readonly FilterField[]) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const query = search.get("q") ?? "";

  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      const next = params.toString();
      startTransition(() =>
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        }),
      );
    },
    [pathname, router, search],
  );

  const isFiltered =
    Boolean(query) ||
    fields.some((field) => {
      const value = search.get(field.key);
      return Boolean(value) && value !== (field.defaultValue ?? "");
    });

  const reset = useCallback(
    () =>
      apply({
        q: null,
        ...Object.fromEntries(fields.map((field) => [field.key, null])),
      }),
    [apply, fields],
  );

  return { apply, isFiltered, pending, query, reset, search };
}

export function FilterBar({
  fields,
  searchPlaceholder = "Search",
}: {
  fields: readonly FilterField[];
  searchPlaceholder?: string | null;
}): JSX.Element {
  const look = FILTER_BAR_LOOK;
  const { apply, isFiltered, pending, query, reset, search } =
    useFilterAddress(fields);
  const [text, setText] = useState(query);
  const [sent, setSent] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);

  if (query !== seenQuery) {
    setSeenQuery(query);
    if (query !== sent) {
      setSent(query);
      setText(query);
    }
  }

  const sendQuery = useCallback(
    (value: string) => {
      setSent(value);
      apply({ q: value || null });
    },
    [apply],
  );

  useEffect(() => {
    const next = text.trim();
    if (next === sent) return;
    const timer = setTimeout(() => sendQuery(next), SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [sendQuery, sent, text]);

  const items: JSX.Element[] = [];
  if (searchPlaceholder) {
    items.push(
      <form
        className={look.form}
        key="q"
        onSubmit={(event) => {
          event.preventDefault();
          const next = text.trim();
          if (next !== sent) sendQuery(next);
        }}
        role="search"
      >
        <Input
          aria-label={searchPlaceholder}
          className={look.input}
          maxLength={80}
          onChange={(event) => setText(event.target.value)}
          placeholder={searchPlaceholder}
          value={text}
        />
        <Icon
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
          icon={
            pending && text.trim()
              ? "svg-spinners:90-ring-with-bg"
              : "solar:magnifer-linear"
          }
          size={15}
        />
      </form>,
    );
  }
  fields.forEach((field, index) => {
    const lone = fields.length % 2 === 1 && index === fields.length - 1;
    const current = search.get(field.key) ?? field.defaultValue ?? ANY_OPTION;
    const options = field.allLabel
      ? [{ label: field.allLabel, value: ANY_OPTION }, ...field.options]
      : field.options;
    items.push(
      <Select
        ariaLabel={field.allLabel ?? field.key}
        className={cn(
          look.select,
          searchPlaceholder && look.share,
          lone && "col-span-full",
        )}
        classNames={{
          content: look.content,
          option: look.option,
          trigger: look.trigger,
        }}
        key={field.key}
        onChange={(value) =>
          apply({
            [field.key]:
              value === ANY_OPTION || value === (field.defaultValue ?? "")
                ? null
                : value,
          })
        }
        options={options}
        value={
          options.some((option) => option.value === current)
            ? current
            : ANY_OPTION
        }
      />,
    );
  });

  return (
    <div className={look.root}>
      {items}
      {isFiltered ? (
        <Button className={look.reset} onClick={reset}>
          <Icon icon="solar:close-circle-linear" size={14} />
          Reset
        </Button>
      ) : null}
    </div>
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
  const highlightGroupId = useId();
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
  const [focusedTarget, setFocusedTarget] = useState<string | null>(null);
  const activeTarget = hoveredTarget ?? focusedTarget;
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(search.toString());
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const step =
    "center size-9 shrink-0 rounded-full type-meta font-semibold ring-1 ring-inset";
  const pageLink = (
    target: string,
    href: string,
    children: ReactNode,
    className: string,
    ariaLabel?: string,
    ariaCurrent?: "page",
    key?: string,
  ) => (
    <AccountLink
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      className={cn(className, "relative isolate")}
      href={href}
      key={key}
      onFocus={() => setFocusedTarget(target)}
      onPointerEnter={() => setHoveredTarget(target)}
    >
      {activeTarget === target ? (
        <SlidingHighlight
          className="rounded-full bg-fill"
          layoutId="pagination-highlight"
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </AccountLink>
  );

  return (
    <LayoutGroup id={`pagination-${highlightGroupId}`}>
      <nav
        aria-label="Pages"
        className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
        onBlurCapture={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setFocusedTarget(null);
          }
        }}
        onPointerLeave={() => setHoveredTarget(null)}
      >
        {page > 1
          ? pageLink(
              "previous",
              hrefFor(page - 1),
              <Icon icon="solar:alt-arrow-left-linear" size={14} />,
              cn(
                step,
                "text-ink-body ring-edge hover:text-ink focus-visible:text-ink",
              ),
              "Previous page",
            )
          : null}
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <span className="px-1 text-ink-faint" key={`gap-${index}`}>
              …
            </span>
          ) : (
            pageLink(
              `page-${entry}`,
              hrefFor(entry),
              entry,
              cn(
                step,
                entry === page
                  ? "text-ink ring-edge-focus"
                  : "text-ink-body ring-edge hover:text-ink focus-visible:text-ink",
              ),
              undefined,
              entry === page ? "page" : undefined,
              `page-${entry}`,
            )
          ),
        )}
        {page < pageCount
          ? pageLink(
              "next",
              hrefFor(page + 1),
              <Icon icon="solar:alt-arrow-right-linear" size={14} />,
              cn(
                step,
                "text-ink-body ring-edge hover:text-ink focus-visible:text-ink",
              ),
              "Next page",
            )
          : null}
      </nav>
    </LayoutGroup>
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
  const toast = useToast();
  const [confirming, setConfirming] = useConfirmStep();
  const [busy, startTransition] = useTransition();

  const run = (work: () => Promise<{ error?: string; success: boolean }>) =>
    startTransition(async () => {
      try {
        const result = await work();
        if (result.success) router.refresh();
        else toast(result.error ?? "Something went wrong");
      } catch (error) {
        report("TileActions", error);
        toast(toUserMessage(error, { fallback: "Something went wrong" }));
      }
      setConfirming(false);
    });

  const remove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    run(() => {
      switch (source.kind) {
        case "list":
          return setMovieListMembershipAction(tmdbId, source.listId, false);
        case "likes":
          return setMovieLibraryAction(tmdbId, "liked", false);
        default:
          return setMovieLibraryAction(
            tmdbId,
            source.kind === "watched" ? "watched" : "watchlist",
            false,
          );
      }
    });
  };

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
