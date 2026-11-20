"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@omerdlw/base-framework/hooks";
import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { createStore } from "@omerdlw/base-framework/utils";
import {
  ACTIVE_SEARCH_TYPES,
  isSearchable,
  normalizeQuery,
  SEARCH_FALLBACK_MESSAGE,
  type SearchFailure,
  type SearchFailureCode,
  type SearchResults,
  type SearchScope,
  type SearchType,
} from "./query";

type SearchHits = SearchResults[SearchType];

type SearchAnswers = ReadonlyMap<string, SearchHits>;

interface SearchState {
  clear: () => void;
  failure: SearchFailure | null;
  input: string;
  isLoading: boolean;
  query: string;
  answered: string;
  results: SearchResults | null;
  retry: () => void;
  setInput: (value: string) => void;
}

const SEARCH_DEBOUNCE_MS = 250;

const SEARCH_CACHE_LIMIT = 80;

const SEARCH_ENDPOINT = "/api/search";

const FAILURE_CODE_BY_STATUS: Readonly<Record<number, SearchFailureCode>> = {
  400: "invalid_query",
  429: "rate_limited",
};

const searchError = (
  code: SearchFailureCode,
  message = SEARCH_FALLBACK_MESSAGE,
): Result<never, SearchFailure> => err({ code, message });

type SearchBatch = Partial<
  Record<SearchType, { hits?: unknown } | { failure?: SearchFailure }>
>;

function isBatch(value: unknown): value is SearchBatch {
  return typeof value === "object" && value !== null;
}

function emptyResults(): SearchResults {
  return {
    lists: [],
    movies: [],
    people: [],
    reviews: [],
    users: [],
  };
}

const answerKey = (kind: SearchType, query: string) =>
  `${kind}:${query.toLowerCase()}`;

function kindsOf(scope: SearchScope): readonly SearchType[] {
  return scope === "all" ? ACTIVE_SEARCH_TYPES : [scope];
}

function collectAnswers(
  store: SearchAnswers,
  holes: ReadonlySet<string>,
  scope: SearchScope,
  query: string,
): SearchResults | null {
  const results = emptyResults();
  for (const kind of kindsOf(scope)) {
    const key = answerKey(kind, query);
    const hits = store.get(key);
    if (!hits && !holes.has(key)) return null;
    Object.assign(results, { [kind]: hits ?? [] });
  }
  return results;
}

function withScores(hits: unknown[]): SearchHits {
  return hits.map((hit) => {
    const { match, score } = hit as { match?: unknown; score?: unknown };
    return {
      ...(hit as object),
      match: typeof match === "number" ? match : 0,
      score: typeof score === "number" ? score : 0,
    };
  }) as SearchHits;
}

async function fetchSearch(
  kinds: readonly SearchType[],
  query: string,
  signal: AbortSignal,
): Promise<
  Result<Partial<Record<SearchType, SearchHits | null>>, SearchFailure>
> {
  let response: Response;
  try {
    response = await fetch(
      `${SEARCH_ENDPOINT}?${new URLSearchParams({ kinds: kinds.join(","), q: query })}`,
      { headers: { accept: "application/json" }, signal },
    );
  } catch {
    return signal.aborted ? searchError("aborted") : searchError("unavailable");
  }

  const body: unknown = await response.json().catch(() => null);
  const payload = body as {
    code?: SearchFailureCode;
    data?: unknown;
    error?: string;
  } | null;

  if (response.ok && isBatch(payload?.data)) {
    const batch = payload.data;
    const answers: Partial<Record<SearchType, SearchHits | null>> = {};
    for (const kind of kinds) {
      const entry = batch[kind] as { hits?: unknown } | undefined;
      answers[kind] = Array.isArray(entry?.hits)
        ? withScores(entry.hits)
        : null;
    }
    return ok(answers);
  }

  return searchError(
    FAILURE_CODE_BY_STATUS[response.status] ?? "unavailable",
    payload?.error,
  );
}

const answerStore = createStore<SearchAnswers>(new Map(), {
  freezeSnapshots: false,
});

function remember(kind: SearchType, query: string, hits: SearchHits) {
  const next = new Map(answerStore.getSnapshot());
  const key = answerKey(kind, query);
  next.delete(key);
  next.set(key, hits);
  for (const oldest of next.keys()) {
    if (next.size <= SEARCH_CACHE_LIMIT) break;
    next.delete(oldest);
  }
  answerStore.publish(next);
}

export function useSearch(scope: SearchScope): SearchState {
  const store = useStore(answerStore);
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [holes, setHoles] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<{
    key: string;
    failure: SearchFailure;
  } | null>(null);
  const [shown, setShown] = useState<{
    query: string;
    scope: SearchScope;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const normalized = normalizeQuery(input);
  const query = isSearchable(normalized) ? normalized : "";
  const fresh = query ? collectAnswers(store, holes, scope, query) : null;
  const known = fresh !== null;
  const failureKey = `${scope}:${query.toLowerCase()}`;
  const failure = failed?.key === failureKey ? failed.failure : null;
  const ready = query && !known && !failure && debounced === query ? query : "";

  if (known && (shown?.query !== query || shown.scope !== scope)) {
    setShown({ query, scope });
  }

  useEffect(() => {
    if (!query || known) return;
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, known]);

  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();
    const { signal } = controller;
    const kinds = kindsOf(scope).filter(
      (kind) => !answerStore.getSnapshot().has(answerKey(kind, ready)),
    );
    void fetchSearch(kinds, ready, signal).then((outcome) => {
      if (signal.aborted) return;
      if (!outcome.success && kinds.length < kindsOf(scope).length) {
        const lost = kinds.map((kind) => answerKey(kind, ready));
        setHoles((current) => new Set([...current, ...lost]));
        return;
      }
      if (!outcome.success) {
        setFailed({
          key: `${scope}:${ready.toLowerCase()}`,
          failure: outcome.error,
        });
        return;
      }

      const missing: string[] = [];
      for (const kind of kinds) {
        const hits = outcome.data[kind];
        if (hits) remember(kind, ready, hits);
        else missing.push(answerKey(kind, ready));
      }
      if (missing.length > 0) {
        setHoles((current) => new Set([...current, ...missing]));
      }
    });
    return () => controller.abort();
  }, [ready, scope, attempt]);

  const clear = useCallback(() => setInput(""), []);
  const retry = useCallback(() => {
    setFailed(null);
    setHoles(new Set());
    setAttempt((value) => value + 1);
  }, []);

  const stale =
    shown && shown.scope === scope
      ? collectAnswers(store, holes, scope, shown.query)
      : null;

  return {
    answered: fresh ? query : stale && shown ? shown.query : "",
    clear,
    failure,
    input,
    isLoading: query !== "" && !known && !failure,
    query,
    results: query ? (fresh ?? stale) : null,
    retry,
    setInput,
  };
}
