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
import { Button, SegmentedControl } from "@omerdlw/base-framework/ui";
import { usePathname } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { SURFACE_SCROLL } from "@/design/components/surface-classes";
import { ACTION_TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { AnimatePresence, motion, useReducedMotion } from "@/motion/lib";
import { POINTS, step, tween } from "@/motion/time";
import styles from "./action.module.css";
import {
  SEARCH_ACTION_KEY,
  SEARCH_ACTION_ORDER,
  SEARCH_CLOSE_ICON,
  SEARCH_EMPTY_HINTS,
  SEARCH_ICON,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_NOUNS,
  SEARCH_REGISTRATION,
  SEARCH_SCOPE_ITEMS,
} from "./constants";
import { useSearch } from "./hooks";
import { SearchPart, SearchStage, SearchSwap } from "./motion";
import { ResultSheet, Roll } from "./results";
import { PagerButton, ResultsSkeleton, Section } from "./sections";
import type { SearchScope } from "./types";
import { arrange, hrefsOf } from "./utils";

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
