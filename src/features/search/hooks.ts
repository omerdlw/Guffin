"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ok, type Result } from "@omerdlw/base-framework/result";
import {
  SEARCH_CACHE_LIMIT,
  SEARCH_DEBOUNCE_MS,
  SEARCH_ENDPOINTS,
} from "./constants";
import type {
  SearchAnswers,
  SearchFailure,
  SearchFailureCode,
  SearchHits,
  SearchResponseMap,
  SearchScope,
  SearchState,
  SearchType,
} from "./types";
import {
  answerKey,
  collectAnswers,
  isSearchable,
  isSearchResponse,
  kindsOf,
  normalizeQuery,
  searchError,
} from "./utils";

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

  const code: SearchFailureCode =
    response.status === 400
      ? "invalid_query"
      : response.status === 429
        ? "rate_limited"
        : "unavailable";
  return searchError(code, payload?.error);
}

let answers: SearchAnswers = new Map();
const answerListeners = new Set<() => void>();

function remember(kind: SearchType, query: string, hits: SearchHits) {
  const next = new Map(answers);
  const key = answerKey(kind, query);
  next.delete(key);
  next.set(key, hits);
  for (const oldest of next.keys()) {
    if (next.size <= SEARCH_CACHE_LIMIT) break;
    next.delete(oldest);
  }
  answers = next;
  answerListeners.forEach((listener) => listener());
}

function subscribeAnswers(listener: () => void) {
  answerListeners.add(listener);
  return () => {
    answerListeners.delete(listener);
  };
}

const readAnswers = () => answers;

export function useSearch(scope: SearchScope): SearchState {
  const store = useSyncExternalStore(
    subscribeAnswers,
    readAnswers,
    readAnswers,
  );
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
      (kind) => !answers.has(answerKey(kind, ready)),
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
