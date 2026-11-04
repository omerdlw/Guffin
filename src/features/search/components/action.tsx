"use client";

import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@/ui/cn";
import { MoviePosterLink, MoviePosterPlaceholder } from "@/features/movie";
import { PersonResultRow } from "./person-result-row";
import {
  Button,
  Icon,
  Input,
  RADIUS,
  SegmentedControl,
  SkeletonBlock,
  TONE,
} from "@/ui";
import { tween } from "@/config/theme/motion";
import { POINTS } from "@/motion/engine/curve";
import { step } from "@/motion/engine/ladder";
import {
  SEARCH_EMPTY_HINTS,
  SEARCH_GROUP_LABELS,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_NOUNS,
  SEARCH_OVERVIEW,
  SEARCH_PER_PAGE,
  SEARCH_SCOPE_ITEMS,
} from "../constants";
import { useSearch } from "../hooks";
import { SearchPart, SearchStage, SearchSwap } from "../motion";
import { arrange, hrefsOf, type SearchSection } from "../overview";
import type { SearchScope } from "../types";
import { ListResultRow } from "./list-result-row";
import { ResultSheet } from "./result-sheet";
import { ReviewResultRow } from "./review-result-row";
import { Roll } from "./roll";
import { UserResultRow } from "./user-result-row";

const POSTER_GRID = "grid grid-cols-4 gap-2.5";
const ROW_LIST = "flex flex-col gap-1";

// The field's clear button comes in turning out of a quarter-turn.
const TURN = tween(step(-1), POINTS.expo);

function Option({
  active,
  children,
  halo = false,
  id,
  index,
  onPointerEnter,
}: {
  active: boolean;
  children: ReactNode;
  halo?: boolean;
  id: string;
  index: number;
  onPointerEnter: () => void;
}) {
  return (
    <li
      aria-selected={active}
      className="relative isolate min-w-0"
      data-active={active ? "" : undefined}
      data-kind={halo ? "tile" : "row"}
      id={id}
      onPointerEnter={onPointerEnter}
      role="option"
    >
      <SearchPart
        className="relative z-10 block min-w-0"
        index={index}
        name={halo ? "tile" : "row"}
      >
        {children}
      </SearchPart>
    </li>
  );
}

function Spacers({ count, kind }: { count: number; kind: "poster" | "row" }) {
  if (count <= 0) return null;
  return Array.from({ length: count }, (_, index) =>
    kind === "poster" ? (
      <li aria-hidden="true" className="invisible min-w-0" inert key={index}>
        <MoviePosterPlaceholder />
      </li>
    ) : (
      <li aria-hidden="true" className="h-16" key={index} />
    ),
  );
}

function rowsOf(
  section: Exclude<SearchSection, { kind: "movies" }>,
  onNavigated: () => void,
  query: string,
): { key: string | number; node: ReactNode }[] {
  switch (section.kind) {
    case "people":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <PersonResultRow
            onNavigated={onNavigated}
            person={hit}
            query={query}
          />
        ),
      }));
    case "users":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <UserResultRow onNavigated={onNavigated} query={query} user={hit} />
        ),
      }));
    case "lists":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <ListResultRow list={hit} onNavigated={onNavigated} query={query} />
        ),
      }));
    case "reviews":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <ReviewResultRow
            onNavigated={onNavigated}
            query={query}
            review={hit}
          />
        ),
      }));
  }
}

function Section({
  active,
  lead,
  onNavigated,
  onOptionPointerEnter,
  optionId,
  query,
  section,
  spacers,
  start,
  titled,
  total,
}: {
  active: number;
  lead: number;
  onNavigated: () => void;
  onOptionPointerEnter: (index: number) => void;
  optionId: (index: number) => string;
  query: string;
  section: SearchSection;
  spacers: number;
  start: number;
  titled: boolean;
  total: number;
}) {
  const label = SEARCH_GROUP_LABELS[section.kind];
  const option = (
    offset: number,
    children: ReactNode,
    key: string | number,
    halo = false,
  ) => (
    <Option
      active={start + offset === active}
      halo={halo}
      id={optionId(start + offset)}
      index={lead + 1 + offset}
      key={key}
      onPointerEnter={() => onOptionPointerEnter(start + offset)}
    >
      {children}
    </Option>
  );

  const list =
    section.kind === "movies" ? (
      <ul aria-label={label} className={POSTER_GRID} role="group">
        {section.hits.map((hit, offset) =>
          option(
            offset,
            <MoviePosterLink
              detail={hit.originalTitle}
              movie={hit}
              onNavigated={onNavigated}
              radius={RADIUS.tile}
              sizes="110px"
            />,
            hit.id,
            true,
          ),
        )}
        <Spacers count={spacers} kind="poster" />
      </ul>
    ) : (
      <ul aria-label={label} className={ROW_LIST} role="group">
        {rowsOf(section, onNavigated, query).map(({ key, node }, offset) =>
          option(offset, node, key),
        )}
        <Spacers count={spacers} kind="row" />
      </ul>
    );

  if (!titled) return list;

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true">
        <SearchPart
          className="flex h-4 items-center justify-between px-1 text-ink-muted"
          index={lead}
          name="row"
        >
          <span className={TONE.label}>{label}</span>
          <span className="type-label font-semibold tabular-nums">
            <Roll value={total} />
          </span>
        </SearchPart>
      </div>
      {list}
    </div>
  );
}

function ResultsSkeleton({ scope }: { scope: SearchScope }) {
  const posters =
    scope === "all"
      ? SEARCH_OVERVIEW.movies
      : scope === "movies"
        ? SEARCH_PER_PAGE.movies
        : 0;
  const rows =
    scope === "all" ? 2 : scope === "movies" ? 0 : SEARCH_PER_PAGE[scope];

  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5">
      {posters > 0 ? (
        <div className={POSTER_GRID}>
          {Array.from({ length: posters }, (_, index) => (
            <SkeletonBlock
              className="aspect-[2/3] w-full rounded-tile"
              key={index}
            />
          ))}
        </div>
      ) : null}
      {rows > 0 ? (
        <div className={ROW_LIST}>
          {Array.from({ length: rows }, (_, index) => (
            <div className="flex h-16 items-center gap-3 p-2" key={index}>
              <SkeletonBlock className="h-12 w-8 shrink-0 rounded-thumb" />
              <div className="flex flex-1 flex-col gap-2">
                <SkeletonBlock className="h-3.5 w-1/2 rounded-full" />
                <SkeletonBlock className="h-3 w-3/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PagerButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  onClick: () => void;
}) {
  const actionClass = useDockActionClass();
  return (
    <Button
      aria-label={direction === "next" ? "Next page" : "Previous page"}
      className={actionClass({
        className:
          "size-8 shrink-0 px-0 disabled:pointer-events-none disabled:opacity-50",
      })}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon
        icon={
          direction === "next"
            ? "solar:alt-arrow-right-linear"
            : "solar:alt-arrow-left-linear"
        }
        size={16}
      />
    </Button>
  );
}

export function SearchAction({
  autoFocus = false,
  onClose,
}: {
  autoFocus?: boolean;
  onClose?: () => void;
} = {}) {
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

  // What is on screen, not what was asked: typing over a stale list keeps
  // the list until the answer lands, and only then does it swap.
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
          className="ui-scan group/field relative w-full rounded-card"
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
            autoFocus={autoFocus}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="h-10 rounded-card bg-fill pr-12 pl-11 text-ink ring-1 ring-edge ring-inset outline-none type-body placeholder:text-ink-muted hover:bg-fill-hover hover:ring-edge-hover focus:bg-fill-hover"
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
                    className="ui-iris center relative size-7 cursor-pointer rounded-inset text-ink-muted hover:text-ink focus-visible:text-ink"
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
              round
              fill
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
                    variant: ACTION_TONE_CLASS,
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
                className="relative isolate flex flex-col gap-4"
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
