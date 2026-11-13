"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@omerdlw/base-framework/hooks";
import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { createStore } from "@omerdlw/base-framework/utils";
import {
  ACTIVE_SEARCH_TYPES,
  isSearchable,
  type ListSearchResponse,
  type MovieSearchResponse,
  normalizeQuery,
  type PersonSearchResponse,
  type ReviewSearchResponse,
  SEARCH_FALLBACK_MESSAGE,
  type SearchFailure,
  type SearchFailureCode,
  type SearchResults,
  type SearchScope,
  type SearchType,
  type UserSearchResponse,
} from "./query";

interface SearchResponseMap {
  lists: ListSearchResponse;
  movies: MovieSearchResponse;
  people: PersonSearchResponse;
  reviews: ReviewSearchResponse;
  shows: MovieSearchResponse;
  users: UserSearchResponse;
}

type SearchHits = SearchResults[SearchType];

type SearchAnswers = ReadonlyMap<string, SearchHits>;

interface SearchState {
  clear: () => void;
  failure: SearchFailure | null;
  input: string;
  isLoading: boolean;
  query: string;
  results: SearchResults | null;
  retry: () => void;
  setInput: (value: string) => void;
}

const SEARCH_DEBOUNCE_MS = 250;

const SEARCH_CACHE_LIMIT = 80;

const SEARCH_ENDPOINTS: Readonly<Record<SearchType, string>> = {
  lists: "/api/search/lists",
  movies: "/api/search/movies",
  people: "/api/search/people",
  reviews: "/api/search/reviews",
  shows: "/api/search/shows",
  users: "/api/search/users",
};

const FAILURE_CODE_BY_STATUS: Readonly<Record<number, SearchFailureCode>> = {
  400: "invalid_query",
  429: "rate_limited",
};

const searchError = (
  code: SearchFailureCode,
  message = SEARCH_FALLBACK_MESSAGE,
): Result<never, SearchFailure> => err({ code, message });

function isSearchResponse(
  value: unknown,
): value is SearchResponseMap[SearchType] {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { hits?: unknown }).hits)
  );
}

function emptyResults(): SearchResults {
  return {
    lists: [],
    movies: [],
    people: [],
    reviews: [],
    shows: [],
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

async function fetchSearch<T extends SearchType>(
  type: T,
  query: string,
  signal?: AbortSignal,
): Promise<Result<SearchResponseMap[T], SearchFailure>> {
  let response: Response;
  try {
    response = await fetch(
      `${SEARCH_ENDPOINTS[type]}?${new URLSearchParams({ q: query })}`,
      {
        headers: { accept: "application/json" },
        signal,
      },
    );
  } catch {
    return signal?.aborted
      ? searchError("aborted")
      : searchError("unavailable");
  }

  const body: unknown = await response.json().catch(() => null);
  const payload = body as {
    code?: SearchFailureCode;
    data?: unknown;
    error?: string;
  } | null;

  if (response.ok && isSearchResponse(payload?.data)) {
    const data = payload.data as SearchResponseMap[T];
    const hits = (data.hits as unknown[]).map((hit) => {
      const { match, score } = hit as { match?: unknown; score?: unknown };
      return {
        ...(hit as object),
        match: typeof match === "number" ? match : 0,
        score: typeof score === "number" ? score : 0,
      };
    });
    return ok({ ...data, hits } as SearchResponseMap[T]);
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
    void Promise.all(
      kinds.map((kind) => fetchSearch(kind, ready, signal)),
    ).then((outcomes) => {
      if (signal.aborted) return;

      const missing: string[] = [];
      let firstFailure: SearchFailure | null = null;
      outcomes.forEach((outcome, index) => {
        if (outcome.success) remember(kinds[index], ready, outcome.data.hits);
        else {
          missing.push(answerKey(kinds[index], ready));
          firstFailure ??= outcome.error;
        }
      });

      const answered =
        outcomes.some((outcome) => outcome.success) ||
        kinds.length < kindsOf(scope).length;
      if (firstFailure && !answered) {
        setFailed({
          key: `${scope}:${ready.toLowerCase()}`,
          failure: firstFailure,
        });
      } else if (missing.length > 0) {
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
