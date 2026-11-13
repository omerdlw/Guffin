"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockContextActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/dock";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import { Button, SegmentedControl } from "@omerdlw/base-framework/ui";
import { usePathname } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { SURFACE_SCROLL } from "@/design/components/surface-classes";
import { ACTION_TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import {
  accountHref,
  listHref,
  movieHref,
  personHref,
  reviewHref,
  tvHref,
} from "@/lib/project";
import { AnimatePresence, motion, useReducedMotion } from "@/motion/lib";
import { POINTS, step, tween } from "@/motion/time";
import styles from "./search-command.module.css";
import { SearchPart, SearchStage, SearchSwap } from "./motion";
import {
  ACTIVE_SEARCH_TYPES,
  MATCH_SCORE,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_OVERVIEW,
  SEARCH_PER_PAGE,
  type SearchResults,
  type SearchScope,
  type SearchSection,
  type SearchType,
} from "./query";
import { ResultSheet, Roll } from "./results";
import { PagerButton, ResultsSkeleton, Section } from "./sections";
import { useSearch } from "./use-search";

interface SearchView {
  page: number;
  pages: number;
  perPage: number;
  sections: SearchSection[];
  total: number;
}

const SEARCH_SCOPE_ITEMS: readonly {
  key: SearchScope;
  label: string;
}[] = (
  [
    { key: "all", label: "All" },
    { key: "movies", label: "Movies" },
    { key: "shows", label: "Shows" },
    { key: "people", label: "People" },
    { key: "users", label: "Users" },
    { key: "lists", label: "Lists" },
    { key: "reviews", label: "Reviews" },
  ] as const
).filter(({ key }) => key === "all" || ACTIVE_SEARCH_TYPES.includes(key));

const SEARCH_NOUNS: Readonly<Record<SearchScope, string>> = {
  all: "results",
  lists: "lists",
  movies: "movies",
  people: "people",
  reviews: "reviews",
  shows: "shows",
  users: "users",
};

const SEARCH_EMPTY_HINTS: Readonly<Record<SearchScope, string>> = {
  all: "Check the spelling, or add a year: dune 1984",
  lists: "Try fewer words from the list's title",
  movies: "Check the spelling, or add a year: dune 1984",
  people: "Check the spelling of the name",
  reviews: "Try a film's title or a few words from a review",
  shows: "Check the spelling, or add a year: shogun 2024",
  users: "Try a username or a display name",
};

const SEARCH_OVERVIEW_LEAD: Readonly<Record<SearchType, number>> = {
  lists: 2,
  movies: 4,
  people: 3,
  reviews: 2,
  shows: 4,
  users: 3,
};

const SEARCH_ICON = "solar:magnifer-linear";

const SEARCH_CLOSE_ICON = "solar:close-bold";

const SEARCH_ACTION_KEY = "search.open";

const SEARCH_ACTION_ORDER = -20;

const TMDB_SEARCH_TYPES: ReadonlySet<SearchType> = new Set([
  "movies",
  "shows",
  "people",
]);

const DISTANT_MATCH = 0.6;

const SEARCH_REGISTRATION = {
  priority: 1000,
  source: REGISTRY_SOURCES.DYNAMIC,
} as const;

function sectionOf<K extends SearchType>(
  kind: K,
  hits: SearchResults[K],
): SearchSection {
  return { kind, hits } as SearchSection;
}

function buildOverview(results: SearchResults): SearchSection[] {
  const top = (hits: readonly { match: number; score: number }[]) => ({
    match: Math.max(0, ...hits.map((hit) => hit.match)),
    score: Math.max(0, ...hits.map((hit) => hit.score)),
  });
  const ranked = ACTIVE_SEARCH_TYPES.filter((kind) => results[kind].length > 0)
    .map((kind) => ({ kind, ...top(results[kind]) }))
    .sort((a, b) => b.score - a.score);

  const closest = Math.max(0, ...ranked.map(({ match }) => match));
  const answering = ranked.filter(
    ({ match }) => closest < MATCH_SCORE.strong || match >= MATCH_SCORE.weak,
  );
  const lead = answering[0]?.score ?? 0;
  return answering
    .filter(
      ({ kind, score }, index) =>
        index === 0 ||
        !TMDB_SEARCH_TYPES.has(kind) ||
        score >= lead * DISTANT_MATCH,
    )
    .map(({ kind }, index) =>
      sectionOf(
        kind,
        results[kind].slice(
          0,
          (index === 0 ? SEARCH_OVERVIEW_LEAD : SEARCH_OVERVIEW)[kind],
        ),
      ),
    );
}

function arrange(
  scope: SearchScope,
  results: SearchResults | null,
  page: number,
): SearchView {
  if (!results) {
    return { page: 0, pages: 1, perPage: 0, sections: [], total: 0 };
  }
  if (scope === "all") {
    const sections = buildOverview(results);
    return { page: 0, pages: 1, perPage: 0, sections, total: 0 };
  }

  const hits = results[scope];
  const perPage = SEARCH_PER_PAGE[scope];
  const pages = Math.max(1, Math.ceil(hits.length / perPage));
  const safe = Math.min(Math.max(page, 0), pages - 1);
  const slice = hits.slice(safe * perPage, (safe + 1) * perPage);
  return {
    page: safe,
    pages,
    perPage,
    sections: slice.length > 0 ? [sectionOf(scope, slice)] : [],
    total: hits.length,
  };
}

function hrefsOf(item: SearchSection): string[] {
  switch (item.kind) {
    case "movies":
      return item.hits.map((hit) => movieHref(hit.id));
    case "shows":
      return item.hits.map((hit) => tvHref(hit.id));
    case "people":
      return item.hits.map((hit) => personHref(hit.id));
    case "users":
      return item.hits.map((hit) => accountHref(hit.username));
    case "lists":
      return item.hits.map((hit) => listHref(hit.owner.username, hit.slug));
    case "reviews":
      return item.hits.map((hit) =>
        reviewHref(hit.tmdbId, hit.author.username),
      );
  }
}

const TURN = tween(step(-1), POINTS.expo);

function SearchAction({ onClose }: { onClose?: () => void } = {}) {
  const { navigate } = useDockActions();
  const actionClass = useDockActionClass();
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [scope, setScope] = useState<SearchScope>("all");
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState<{
    key: string;
    index: number;
    source: "keyboard" | "pointer";
  } | null>(null);
  const { clear, failure, input, isLoading, query, results, retry, setInput } =
    useSearch(scope);

  const view = arrange(scope, results, page);
  const hrefs = view.sections.flatMap(hrefsOf);
  const hitCount = hrefs.length;
  const viewKey = `${scope}:${query}:${view.page}`;
  const active = cursor?.key === viewKey ? cursor.index : -1;
  const keyboardActive = cursor?.source === "keyboard" ? active : -1;

  useEffect(() => {
    if (keyboardActive < 0) return;
    document
      .getElementById(`${listId}-option-${keyboardActive}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [keyboardActive, listId]);
  const optionId = (index: number) => `${listId}-option-${index}`;

  const showSkeleton = isLoading && hitCount === 0;
  const showEmpty = !isLoading && !failure && query !== "" && hitCount === 0;

  const handleInput = (value: string) => {
    setInput(value);
    setPage(0);
  };

  const handleScope = (next: SearchScope) => {
    setScope(next);
    setPage(0);
  };

  const handleClear = () => {
    clear();
    setPage(0);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const href = hrefs[Math.max(active, 0)];
    if (!href || (isLoading && active < 0)) return;
    void navigate(href).then((committed) => {
      if (committed) handleClear();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (hitCount === 0) return;
      event.preventDefault();
      const next =
        event.key === "ArrowDown"
          ? Math.min(active + 1, hitCount - 1)
          : Math.max(active - 1, -1);
      setCursor({ index: next, key: viewKey, source: "keyboard" });
      return;
    }

    if (event.key !== "Escape") return;
    if (active >= 0) {
      event.stopPropagation();
      setCursor(null);
    } else if (input) {
      event.stopPropagation();
      handleClear();
    } else if (onClose) {
      event.stopPropagation();
      onClose();
    }
  };

  const hasPager = scope !== "all" && view.pages > 1;
  const from = view.page * view.perPage + 1;
  const to = Math.min(from + view.perPage - 1, view.total);

  const starts = view.sections.map((_, index) =>
    view.sections
      .slice(0, index)
      .reduce((count, section) => count + section.hits.length, 0),
  );
  const titled = scope === "all";
  const sections = view.sections.map((section, index) => (
    <Section
      active={active}
      key={section.kind}
      lead={starts[index] + index}
      onNavigated={handleClear}
      onOptionPointerEnter={(index) =>
        setCursor({ index, key: viewKey, source: "pointer" })
      }
      optionId={optionId}
      query={query}
      section={section}
      spacers={hasPager ? view.perPage - section.hits.length : 0}
      start={starts[index]}
      titled={titled}
      total={results?.[section.kind].length ?? section.hits.length}
    />
  ));

  const shown = `${scope}:${view.page}:${hrefs.join("|")}`;
  const swapId = failure
    ? "failure"
    : hitCount > 0
      ? shown
      : showSkeleton
        ? `loading:${scope}`
        : showEmpty
          ? `empty:${scope}:${query}`
          : "idle";

  return (
    <SearchStage className="flex flex-col">
      <SearchPart name="item">
        <form
          className={cn(
            styles.scan,
            "group/field relative w-full rounded-card",
          )}
          data-busy={isLoading ? "" : undefined}
          onSubmit={handleSubmit}
          role="search"
        >
          <Icon
            className={cn(
              "cine-fade pointer-events-none absolute top-1/2 left-4 -translate-y-1/2",
              input
                ? "text-grade"
                : "text-ink-muted group-focus-within/field:text-ink",
            )}
            icon="solar:magnifer-linear"
            size={16}
          />
          <Input
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={hitCount > 0}
            aria-label="Search movies, people, users, lists and reviews"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="pr-12 pl-11"
            enterKeyHint="search"
            maxLength={SEARCH_MAX_QUERY_LENGTH}
            name="search"
            onChange={(event) => handleInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, people, users, lists…"
            role="combobox"
            spellCheck={false}
            type="text"
            value={input}
          />
          <div className="absolute top-1/2 right-2 -translate-y-1/2">
            <AnimatePresence initial={false} mode="popLayout">
              {input ? (
                <motion.div
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: reduced ? 0 : -45, scale: 0.7 }}
                  initial={{
                    opacity: 0,
                    rotate: reduced ? 0 : -45,
                    scale: 0.7,
                  }}
                  key="clear"
                  transition={TURN}
                >
                  <Button
                    aria-label="Clear search"
                    className="size-7 rounded-inset text-ink-muted"
                    icon
                    intent="ghost"
                    size="xs"
                    onClick={handleClear}
                  >
                    <Icon icon="material-symbols:close-rounded" size={16} />
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </form>
      </SearchPart>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-settle ease-in-out-cubic",
          query ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!query}
      >
        <div className="min-h-0 overflow-hidden">
          <SearchPart className="pt-2.5" name="item">
            <SegmentedControl
              ariaLabel="Search for"
              width="fill"
              items={SEARCH_SCOPE_ITEMS}
              onChange={handleScope}
              value={scope}
            />
          </SearchPart>
        </div>
      </div>

      <div aria-live="polite">
        <SearchSwap
          className="flex flex-col gap-2.5 pt-2.5 empty:hidden"
          cue="rows"
          id={swapId}
          now
        >
          {failure ? (
            <SearchPart
              className="flex flex-col items-center gap-2.5"
              name="note"
            >
              <p className="px-1 py-2 text-center type-body text-ink-muted">
                {failure.message}
              </p>
              {failure.code !== "invalid_query" ? (
                <Button
                  className={actionClass({
                    className: "h-10",
                    variant: ACTION_TONE,
                  })}
                  onClick={retry}
                >
                  Try again
                </Button>
              ) : null}
            </SearchPart>
          ) : hitCount > 0 ? (
            <>
              <div
                aria-label="Search results"
                className={cn(
                  SURFACE_SCROLL,
                  "relative isolate flex max-h-[min(52dvh,30rem)] scroll-p-1 flex-col gap-4 p-1",
                )}
                id={listId}
                key={viewKey}
                onPointerLeave={() => {
                  setCursor((current) =>
                    current?.source === "pointer" ? null : current,
                  );
                }}
                ref={listRef}
                role="listbox"
              >
                <ResultSheet
                  activeId={active >= 0 ? optionId(active) : null}
                  listRef={listRef}
                />
                {sections}
              </div>

              {hasPager ? (
                <SearchPart
                  className="flex h-8 items-center justify-between pl-1"
                  index={hitCount + view.sections.length + 1}
                  name="row"
                >
                  <span className="type-meta text-ink-muted tabular-nums">
                    <Roll value={`${from}–${to} of ${view.total}`} />
                  </span>
                  <span className="flex items-center gap-1">
                    <PagerButton
                      direction="previous"
                      disabled={view.page === 0}
                      onClick={() => setPage(view.page - 1)}
                    />
                    <PagerButton
                      direction="next"
                      disabled={view.page >= view.pages - 1}
                      onClick={() => setPage(view.page + 1)}
                    />
                  </span>
                </SearchPart>
              ) : null}
            </>
          ) : showSkeleton ? (
            <SearchPart name="note">
              <ResultsSkeleton scope={scope} />
            </SearchPart>
          ) : showEmpty ? (
            <SearchPart
              className="flex flex-col items-center gap-1 px-1 py-3 text-center"
              name="note"
            >
              <p className="type-body text-ink-body">
                No {SEARCH_NOUNS[scope]} for “{query}”
              </p>
              <p className="type-meta text-ink-muted">
                {SEARCH_EMPTY_HINTS[scope]}
              </p>
            </SearchPart>
          ) : null}
        </SearchSwap>
      </div>
    </SearchStage>
  );
}

export function SearchDockCommand(): null {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const frontPath = useDockSelector((state) => state.activeItem?.path ?? null);

  const toggle = useCallback(() => {
    setOpenPath((current) => (current === pathname ? null : pathname));
  }, [pathname]);

  const close = useCallback(() => setOpenPath(null), []);

  const dock = useMemo(
    () =>
      open
        ? {
            action: <SearchAction onClose={close} />,
            ...(frontPath ? { path: frontPath } : {}),
          }
        : null,
    [close, frontPath, open],
  );
  useDockRegistration(dock, SEARCH_REGISTRATION);

  const actions = useMemo(
    () => [
      {
        icon: open ? SEARCH_CLOSE_ICON : SEARCH_ICON,
        key: SEARCH_ACTION_KEY,
        onClick: toggle,
        order: SEARCH_ACTION_ORDER,
        tooltip: open ? "Close search" : "Search",
      },
    ],
    [open, toggle],
  );

  useDockContextActions(actions);
  return null;
}
