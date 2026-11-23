"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { Button } from "@omerdlw/base-framework/ui";
import { SegmentedControl } from "@/design/components/segmented-control";
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
} from "@/shared/project";
import styles from "./search-action.module.css";
import { SearchPart, SearchStage, SearchSwap, useSearchPart } from "./motion";

export { SearchStyle } from "./motion";
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
import { ResultSheet } from "./results";
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
  users: "users",
};

const SEARCH_EMPTY_HINTS: Readonly<Record<SearchScope, string>> = {
  all: "Check the spelling, or add a year: dune 1984",
  lists: "Try fewer words from the list's title",
  movies: "Check the spelling, or add a year: dune 1984",
  people: "Check the spelling of the name",
  reviews: "Try a film's title or a few words from a review",
  users: "Try a username or a display name",
};

const SEARCH_OVERVIEW_LEAD: Readonly<Record<SearchType, number>> = {
  lists: 2,
  movies: 4,
  people: 3,
  reviews: 2,
  users: 3,
};

const TMDB_SEARCH_TYPES: ReadonlySet<SearchType> = new Set([
  "movies",
  "people",
]);

const DISTANT_MATCH = 0.6;

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

export function SearchAction({ onClose }: { onClose?: () => void } = {}) {
  const { navigate } = useDockActions();
  const actionClass = useDockActionClass();
  const drawerPart = useSearchPart("drawer");
  const resultsPart = useSearchPart("results");
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [scope, setScope] = useState<SearchScope>("all");
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState<{
    key: string;
    index: number;
    source: "keyboard" | "pointer";
  } | null>(null);
  const {
    answered,
    clear,
    failure,
    input,
    isLoading,
    query,
    results,
    retry,
    setInput,
  } = useSearch(scope);

  const view = arrange(scope, results, page);
  const hrefs = view.sections.flatMap(hrefsOf);
  const hitCount = hrefs.length;
  const viewKey = `${scope}:${answered}:${view.page}`;
  const active = cursor?.key === viewKey ? cursor.index : -1;
  const keyboardActive = cursor?.source === "keyboard" ? active : -1;

  useEffect(() => {
    const opener = document.activeElement;
    if (opener instanceof HTMLElement && opener !== document.body) {
      openerRef.current = opener;
    }
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (keyboardActive < 0) return;
    document
      .getElementById(`${listId}-option-${keyboardActive}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [keyboardActive, listId]);
  const optionId = useCallback(
    (index: number) => `${listId}-option-${index}`,
    [listId],
  );
  const pointTo = useCallback(
    (index: number) => setCursor({ index, key: viewKey, source: "pointer" }),
    [viewKey],
  );

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

  const handleClear = useCallback(() => {
    clear();
    setPage(0);
  }, [clear]);

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
      openerRef.current?.focus({ preventScroll: true });
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
      active={
        active >= starts[index] && active < starts[index] + section.hits.length
          ? active - starts[index]
          : -1
      }
      key={section.kind}
      lead={starts[index] + index}
      onMore={titled ? () => handleScope(section.kind) : undefined}
      onNavigated={handleClear}
      onOptionPointerEnter={pointTo}
      optionId={optionId}
      query={answered}
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
      <form
        className={cn(styles.scan, "group/field relative w-full rounded-card")}
        data-busy={isLoading ? "" : undefined}
        onSubmit={handleSubmit}
        role="search"
      >
        <Icon
          className={cn(
            "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2",
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
          ref={inputRef}
          role="combobox"
          spellCheck={false}
          type="text"
          value={input}
        />
        <div className="absolute top-1/2 right-1 -translate-y-1/2">
          {input ? (
            <Button
              aria-label="Clear search"
              icon
              intent="ghost"
              onClick={handleClear}
              shape="pill"
              size="sm"
            >
              <Icon icon="solar:close-circle-bold" size={16} />
            </Button>
          ) : null}
        </div>
      </form>

      <div
        {...drawerPart}
        className={cn(
          "grid",
          query ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!query}
      >
        <div className="-mx-4 -mt-2 -mb-6 min-h-0 overflow-hidden px-4 pt-2 pb-6">
          <SearchPart
            className={cn("pt-2.5", !query && "-translate-y-3 scale-95")}
            name="scopes"
          >
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
                    className: "h-control-md",
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
                key={viewKey}
                {...resultsPart}
                aria-busy={isLoading || undefined}
                aria-label="Search results"
                className={cn(
                  SURFACE_SCROLL,
                  "relative isolate -mx-1 flex max-h-[min(56dvh,34rem)] scroll-p-1 flex-col gap-4 p-1 aria-busy:opacity-60",
                )}
                id={listId}
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
                  className="flex items-center justify-between"
                  index={hitCount + view.sections.length + 1}
                  name="footer"
                >
                  <PagerButton
                    direction="previous"
                    disabled={view.page === 0}
                    onClick={() => setPage(view.page - 1)}
                  />
                  <span className="flex flex-col items-center type-meta text-ink-muted tabular-nums">
                    <span className="font-semibold text-ink">{`${from}–${to}`}</span>
                    <span>of {view.total}</span>
                  </span>
                  <PagerButton
                    direction="next"
                    disabled={view.page >= view.pages - 1}
                    onClick={() => setPage(view.page + 1)}
                  />
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
