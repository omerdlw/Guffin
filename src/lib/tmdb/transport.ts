import { err, ok, type Result } from "@omerdlw/base-framework/result";
import type { z } from "zod";
import {
  TMDB_API_BASE_URL,
  TMDB_CACHE_TAG,
  TMDB_RETRY,
  TMDB_SEARCH_LIMITS,
  TMDB_TIMEOUT_MS,
} from "./shared";

export type TmdbError =
  | { kind: "misconfigured"; message: string }
  | { kind: "invalid_request"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "unauthorized"; message: string; status: number }
  | {
      kind: "rate_limited";
      message: string;
      retryAfterMs: number | null;
    }
  | { kind: "upstream"; message: string; status: number }
  | { kind: "timeout"; message: string }
  | { kind: "network"; message: string }
  | { kind: "invalid_response"; message: string; issues: string[] };

type TmdbErrorKind = TmdbError["kind"];

const EXPECTED_KINDS: ReadonlySet<TmdbErrorKind> = new Set([
  "invalid_request",
  "not_found",
]);

export function isExpectedTmdbError(error: TmdbError): boolean {
  return EXPECTED_KINDS.has(error.kind);
}

export const tmdbErrors = {
  misconfigured: (message: string): TmdbError => ({
    kind: "misconfigured",
    message,
  }),
  invalidRequest: (message: string): TmdbError => ({
    kind: "invalid_request",
    message,
  }),
  notFound: (message = "The requested resource was not found"): TmdbError => ({
    kind: "not_found",
    message,
  }),
  unauthorized: (status: number): TmdbError => ({
    kind: "unauthorized",
    message: "TMDB rejected the access token",
    status,
  }),
  rateLimited: (retryAfterMs: number | null): TmdbError => ({
    kind: "rate_limited",
    message: "TMDB rate limit exceeded",
    retryAfterMs,
  }),
  upstream: (status: number): TmdbError => ({
    kind: "upstream",
    message: `TMDB responded with status ${status}`,
    status,
  }),
  timeout: (timeoutMs: number): TmdbError => ({
    kind: "timeout",
    message: `TMDB did not respond within ${timeoutMs}ms`,
  }),
  network: (message: string): TmdbError => ({ kind: "network", message }),
  invalidResponse: (path: string, issues: string[]): TmdbError => ({
    kind: "invalid_response",
    message: `TMDB returned an unexpected payload for ${path}`,
    issues,
  }),
} as const;

const LANGUAGE_TAG = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export function isTmdbId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function normalizeSearchQuery(query: unknown): string {
  return typeof query === "string" ? query.trim().replace(/\s+/g, " ") : "";
}

export function checkLanguage(language: string): TmdbError | null {
  return LANGUAGE_TAG.test(language)
    ? null
    : tmdbErrors.invalidRequest(`Unsupported language "${language}"`);
}

export function checkPage(page: number): TmdbError | null {
  return Number.isInteger(page) &&
    page >= 1 &&
    page <= TMDB_SEARCH_LIMITS.maxPage
    ? null
    : tmdbErrors.invalidRequest(
        `Page must be an integer from 1 to ${TMDB_SEARCH_LIMITS.maxPage}`,
      );
}

export function checkSearchInput(
  query: string,
  page: number,
  language: string,
): { query: string } | { error: TmdbError } {
  const normalized = normalizeSearchQuery(query);
  if (
    normalized.length === 0 ||
    normalized.length > TMDB_SEARCH_LIMITS.maxQueryLength
  ) {
    return {
      error: tmdbErrors.invalidRequest(
        `Search query must be 1-${TMDB_SEARCH_LIMITS.maxQueryLength} characters`,
      ),
    };
  }
  const invalid = checkPage(page) ?? checkLanguage(language);
  if (invalid) return { error: invalid };

  return { query: normalized };
}

export interface TmdbConfig {
  accessToken: string;
  baseUrl?: string;
}

type TmdbQuery = Record<
  string,
  string | number | boolean | null | undefined
>;

interface TmdbRequest<T> {
  path: string;
  query?: TmdbQuery;
  schema: z.ZodType<T, unknown>;
  revalidate?: number;
  tags?: readonly string[];
  signal?: AbortSignal;
}

export interface TmdbTransportOptions {
  config: () => TmdbConfig | null;
  onError?: (error: TmdbError, path: string) => void;
}

export interface TmdbTransport {
  request<T>(request: TmdbRequest<T>): Promise<Result<T, TmdbError>>;
}

export type NextFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  429, 500, 502, 503, 504,
]);

interface Attempt<T> {
  result: Result<T, TmdbError>;
  retryable: boolean;
  retryAfterMs: number | null;
}

function buildTmdbUrl(
  baseUrl: string,
  path: string,
  query: TmdbQuery = {},
): URL {
  const url = new URL(
    `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
  );
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

function parseRetryAfter(
  header: string | null,
  now: number = Date.now(),
): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function describeIssues(error: z.ZodError): string[] {
  return error.issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

function backoff(attempt: number): number {
  const ceiling = Math.min(
    TMDB_RETRY.maxDelayMs,
    TMDB_RETRY.baseDelayMs * 2 ** attempt,
  );
  return Math.round(Math.random() * ceiling);
}

export function createTmdbTransport(
  options: TmdbTransportOptions,
): TmdbTransport {
  async function attemptOnce<T>(
    request: TmdbRequest<T>,
    config: TmdbConfig,
  ): Promise<Attempt<T>> {
    const fail = (
      error: TmdbError,
      retryable = false,
      retryAfterMs: number | null = null,
    ): Attempt<T> => ({ result: err(error), retryable, retryAfterMs });

    const timeoutSignal = AbortSignal.timeout(TMDB_TIMEOUT_MS);
    const signal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;
    const url = buildTmdbUrl(
      config.baseUrl ?? TMDB_API_BASE_URL,
      request.path,
      request.query,
    );

    let response: Response;
    try {
      const init: NextFetchInit = {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${config.accessToken}`,
        },
        signal,
        next: {
          revalidate: request.revalidate,
          tags: [TMDB_CACHE_TAG, ...(request.tags ?? [])],
        },
      };
      response = await fetch(url, init);
    } catch (cause) {
      if (timeoutSignal.aborted) {
        return fail(tmdbErrors.timeout(TMDB_TIMEOUT_MS), true);
      }
      if (request.signal?.aborted) {
        return fail(tmdbErrors.network("The request was aborted"));
      }
      return fail(
        tmdbErrors.network(
          cause instanceof Error ? cause.message : "Network request failed",
        ),
        true,
      );
    }

    const { status } = response;
    if (status === 401 || status === 403) {
      return fail(tmdbErrors.unauthorized(status));
    }
    if (status === 404) return fail(tmdbErrors.notFound());
    if (status === 400 || status === 422) {
      return fail(tmdbErrors.invalidRequest(`TMDB rejected ${request.path}`));
    }
    if (status === 429) {
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      return fail(tmdbErrors.rateLimited(retryAfterMs), true, retryAfterMs);
    }
    if (!response.ok) {
      return fail(tmdbErrors.upstream(status), RETRYABLE_STATUSES.has(status));
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return fail(
        tmdbErrors.invalidResponse(request.path, ["body is not valid JSON"]),
      );
    }

    const parsed = request.schema.safeParse(body);
    if (!parsed.success) {
      return fail(
        tmdbErrors.invalidResponse(request.path, describeIssues(parsed.error)),
      );
    }
    return { result: ok(parsed.data), retryable: false, retryAfterMs: null };
  }

  return {
    async request<T>(request: TmdbRequest<T>): Promise<Result<T, TmdbError>> {
      const config = options.config();
      if (!config?.accessToken) {
        const error = tmdbErrors.misconfigured(
          "TMDB_READ_ACCESS_TOKEN is not set",
        );
        options.onError?.(error, request.path);
        return err(error);
      }

      for (let attempt = 0; ; attempt++) {
        const outcome = await attemptOnce(request, config);
        const { result } = outcome;
        if (result.success) return result;

        const exhausted = attempt >= TMDB_RETRY.maxRetries;
        const tooLong =
          outcome.retryAfterMs !== null &&
          outcome.retryAfterMs > TMDB_RETRY.maxRetryAfterMs;

        if (!outcome.retryable || exhausted || tooLong) {
          if (!isExpectedTmdbError(result.error)) {
            options.onError?.(result.error, request.path);
          }
          return result;
        }
        await sleep(outcome.retryAfterMs ?? backoff(attempt));
      }
    },
  };
}
