import { err, ok, type Result } from "@omerdlw/base-framework/result";
import type { z } from "zod";
import { type AwardsApi, createAwardsApi } from "./awards";
import {
  featuredMoviePageSchema,
  foundMoviesSchema,
  movieDetailsSchema,
  movieImagesSchema,
  movieSearchPageSchema,
  personDetailsSchema,
  personSearchPageSchema,
} from "./schemas";
import {
  type FeaturedMovie,
  type FeaturedMoviePage,
  type MovieDetails,
  type MovieImages,
  type MovieSearchPage,
  type PersonDetails,
  type PersonSearchPage,
  TMDB_API_BASE_URL,
  TMDB_CACHE_TAG,
  TMDB_DEFAULT_LANGUAGE,
  TMDB_RETRY,
  TMDB_REVALIDATE,
  TMDB_SEARCH_LIMITS,
  TMDB_TIMEOUT_MS,
  tmdbCacheTag,
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

function checkPage(page: number): TmdbError | null {
  return Number.isInteger(page) &&
    page >= 1 &&
    page <= TMDB_SEARCH_LIMITS.maxPage
    ? null
    : tmdbErrors.invalidRequest(
        `Page must be an integer from 1 to ${TMDB_SEARCH_LIMITS.maxPage}`,
      );
}

function checkSearchInput(
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

const GENRE = Object.freeze({
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  scienceFiction: 878,
  thriller: 53,
  tvMovie: 10770,
  war: 10752,
  western: 37,
  kids: 10762,
  news: 10763,
  reality: 10764,
  soap: 10766,
  talk: 10767,
});

const NON_FILM_GENRES: ReadonlySet<number> = new Set([
  GENRE.news,
  GENRE.reality,
  GENRE.soap,
  GENRE.talk,
]);

const SCRIPTED_GENRES: ReadonlySet<number> = new Set([
  GENRE.action,
  GENRE.adventure,
  GENRE.animation,
  GENRE.comedy,
  GENRE.crime,
  GENRE.drama,
  GENRE.family,
  GENRE.fantasy,
  GENRE.horror,
  GENRE.mystery,
  GENRE.romance,
  GENRE.scienceFiction,
  GENRE.thriller,
  GENRE.war,
  GENRE.western,
]);

const EVENT_TITLE = new RegExp(
  [
    String.raw`\b\d{1,3}(?:st|nd|rd|th)\s+(?:annual\s+)?[\w'’&. -]*?\b(?:awards?|ceremony|gala)\b`,
    String.raw`\b(?:award|prize)s?\s+(?:ceremony|show|gala|night)\b`,
    String.raw`\b(?:academy|golden globe|bafta|emmy|grammy|tony|mtv (?:movie|video music)|critics'? choice|people'?s choice|kids'? choice|screen actors guild|sag|independent spirit|césar|cesar|goya|razzie|golden raspberry)s?\s+awards?\b`,
    String.raw`\bred carpet\b`,
    String.raw`\bbehind the scenes\b`,
    String.raw`\b(?:the )?making of\b`,
    String.raw`\b(?:blooper|gag) reel\b|\bbloopers\b`,
    String.raw`\bfeaturettes?\b`,
    String.raw`\bscreen tests?\b`,
    String.raw`\bpress (?:conference|junket|tour)\b`,
    String.raw`\bq\s*&\s*a\b`,
    String.raw`\bcomic[- ]con\b`,
    String.raw`\b(?:an )?evening with\b|\bin conversation with\b|\binterview with\b`,
    String.raw`\b(?:the )?(?:tonight show|late show|late late show|late night with|saturday night live|the view|good morning america|today show|jimmy kimmel live|the daily show|graham norton show|ellen degeneres show|oprah winfrey show|live with (?:regis|kelly|kathie))\b`,
  ].join("|"),
  "i",
);

const SELF_ROLE =
  /^\s*(?:as\s+)?(?:self|himself|herself|themselves?|themself)\b/i;

const ARCHIVE_ROLE = /\b(?:archive|archival|file footage|stock footage)\b/i;

const APPEARANCE_ROLE =
  /\b(?:host|co-?host|presenter|narrator|interviewee|interviewer|guest|contestant|panelist|announcer|commentator|moderator|participant|himself|herself|themselves?)\b/i;

const NOT_A_JOB =
  /\b(?:thanks|dedicatee|dedicated to|in memory of|acknowledg(?:e)?ments?|archival (?:footage|material)|stock footage|catering|craft service)\b/i;

const DOCUMENTARY_AUTHORSHIP =
  /^(?:co-)?director$|\bwriter\b|screenplay|\bstory\b|producer|\bediting?\b|editor|director of photography|cinematograph|composer|\bcreator\b/i;

interface TitleSignals {
  genreIds: readonly number[];
  originalTitle?: string | null;
  title: string;
  video: boolean;
}

const hasGenre = (signals: TitleSignals, genre: number) =>
  signals.genreIds.includes(genre);

const isScripted = (signals: TitleSignals) =>
  signals.genreIds.some((genre) => SCRIPTED_GENRES.has(genre));

const looksLikeEvent = (signals: TitleSignals) =>
  EVENT_TITLE.test(signals.title) ||
  (signals.originalTitle ? EVENT_TITLE.test(signals.originalTitle) : false);

export function isFilmTitle(signals: TitleSignals): boolean {
  if (signals.genreIds.some((genre) => NON_FILM_GENRES.has(genre))) {
    return false;
  }
  if (isScripted(signals)) return true;
  if (looksLikeEvent(signals)) return false;
  if (
    signals.video &&
    (hasGenre(signals, GENRE.documentary) || signals.genreIds.length === 0)
  ) {
    return false;
  }
  return true;
}

export function isActingCredit(
  signals: TitleSignals & { character: string | null },
): boolean {
  if (!isFilmTitle(signals)) return false;
  const { character } = signals;
  if (character && ARCHIVE_ROLE.test(character)) return false;

  const self = character ? SELF_ROLE.test(character) : false;
  const documentary = hasGenre(signals, GENRE.documentary);
  const tvMovie = hasGenre(signals, GENRE.tvMovie);
  const scripted = isScripted(signals);

  if ((documentary || tvMovie) && !scripted) return false;
  if (documentary || tvMovie) {
    return !self && !(character && APPEARANCE_ROLE.test(character));
  }
  if (!scripted && self) return false;
  return true;
}

export function isCrewCredit(
  signals: TitleSignals & { job: string | null },
): boolean {
  if (!isFilmTitle(signals)) return false;
  const { job } = signals;
  if (job && NOT_A_JOB.test(job)) return false;

  if (hasGenre(signals, GENRE.documentary) && !isScripted(signals)) {
    return job ? DOCUMENTARY_AUTHORSHIP.test(job) : false;
  }
  return true;
}

export interface TmdbConfig {
  accessToken: string;
  baseUrl?: string;
}

type TmdbQuery = Record<string, string | number | boolean | null | undefined>;

interface TmdbRequest<T> {
  path: string;
  query?: TmdbQuery;
  schema: z.ZodType<T, unknown>;
  revalidate?: number;
  tags?: readonly string[];
  signal?: AbortSignal;
}

interface TmdbTransportOptions {
  config: () => TmdbConfig | null;
  onError?: (error: TmdbError, path: string) => void;
}

interface TmdbTransport {
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

function createTmdbTransport(options: TmdbTransportOptions): TmdbTransport {
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

export interface MovieDetailsOptions {
  language?: string;
  signal?: AbortSignal;
}

export interface MovieSearchOptions extends MovieDetailsOptions {
  page?: number;
  year?: number;
}

const APPENDED_RESOURCES = [
  "credits",
  "images",
  "videos",
  "release_dates",
  "recommendations",
  "watch/providers",
  "external_ids",
  "keywords",
].join(",");

interface MoviesApi {
  getDetails(
    id: number,
    options?: MovieDetailsOptions,
  ): Promise<Result<MovieDetails, TmdbError>>;
  getImages(
    id: number,
    options?: Pick<MovieDetailsOptions, "signal">,
  ): Promise<Result<MovieImages, TmdbError>>;
  search(
    query: string,
    options?: MovieSearchOptions,
  ): Promise<Result<MovieSearchPage, TmdbError>>;
}

function createMoviesApi(transport: TmdbTransport): MoviesApi {
  return {
    async getDetails(id, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
      if (!isTmdbId(id)) {
        return err(
          tmdbErrors.invalidRequest("Movie id must be a positive integer"),
        );
      }
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/movie/${id}`,
        query: {
          language,
          append_to_response: APPENDED_RESOURCES,
          include_image_language: `${language.slice(0, 2)},null`,
        },
        schema: movieDetailsSchema,
        revalidate: TMDB_REVALIDATE.movie,
        tags: [tmdbCacheTag("movie", id)],
        signal,
      });
    },

    async getImages(id, { signal } = {}) {
      if (!isTmdbId(id)) {
        return err(
          tmdbErrors.invalidRequest("Movie id must be a positive integer"),
        );
      }
      return transport.request({
        path: `/movie/${id}/images`,
        schema: movieImagesSchema,
        revalidate: TMDB_REVALIDATE.movie,
        tags: [tmdbCacheTag("movie", id)],
        signal,
      });
    },

    async search(
      query,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal, year } = {},
    ) {
      const checked = checkSearchInput(query, page, language);
      if ("error" in checked) return err(checked.error);

      return transport.request({
        path: "/search/movie",
        query: {
          query: checked.query,
          language,
          page,
          include_adult: false,
          ...(year ? { primary_release_year: year } : {}),
        },
        schema: movieSearchPageSchema,
        revalidate: TMDB_REVALIDATE.search,
        signal,
      });
    },
  };
}

export interface PersonDetailsOptions {
  language?: string;
  signal?: AbortSignal;
}

export interface PersonSearchOptions extends PersonDetailsOptions {
  page?: number;
}

const PEOPLE_APPENDED_RESOURCES = [
  "movie_credits",
  "images",
  "external_ids",
].join(",");

interface PeopleApi {
  getDetails(
    id: number,
    options?: PersonDetailsOptions,
  ): Promise<Result<PersonDetails, TmdbError>>;
  search(
    query: string,
    options?: PersonSearchOptions,
  ): Promise<Result<PersonSearchPage, TmdbError>>;
}

function createPeopleApi(transport: TmdbTransport): PeopleApi {
  return {
    async getDetails(id, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
      if (!isTmdbId(id)) {
        return err(
          tmdbErrors.invalidRequest("Person id must be a positive integer"),
        );
      }
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/person/${id}`,
        query: { language, append_to_response: PEOPLE_APPENDED_RESOURCES },
        schema: personDetailsSchema,
        revalidate: TMDB_REVALIDATE.person,
        tags: [tmdbCacheTag("person", id)],
        signal,
      });
    },

    async search(
      query,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const checked = checkSearchInput(query, page, language);
      if ("error" in checked) return err(checked.error);

      return transport.request({
        path: "/search/person",
        query: {
          query: checked.query,
          language,
          page,
          include_adult: false,
        },
        schema: personSearchPageSchema,
        revalidate: TMDB_REVALIDATE.search,
        signal,
      });
    },
  };
}

const MOVIE_LISTS = [
  "now_playing",
  "popular",
  "top_rated",
  "upcoming",
] as const;
export type MovieList = (typeof MOVIE_LISTS)[number];

const TRENDING_WINDOWS = ["day", "week"] as const;
export type TrendingWindow = (typeof TRENDING_WINDOWS)[number];

const DISCOVER_SORTS = [
  "popularity.desc",
  "vote_count.desc",
  "primary_release_date.desc",
  "primary_release_date.asc",
] as const;
type DiscoverSort = (typeof DISCOVER_SORTS)[number];

const MIN_VOTES: Record<DiscoverSort, number> = {
  "popularity.desc": 150,
  "vote_count.desc": 0,
  "primary_release_date.desc": 40,
  "primary_release_date.asc": 300,
};

export interface ListOptions {
  language?: string;
  page?: number;
  signal?: AbortSignal;
}

export interface DiscoverOptions extends ListOptions {
  genre?: number | null;
  decade?: number | null;
  sort?: DiscoverSort;
}

interface DiscoverApi {
  trending(
    window: TrendingWindow,
    options?: ListOptions,
  ): Promise<Result<FeaturedMoviePage, TmdbError>>;
  list(
    list: MovieList,
    options?: ListOptions,
  ): Promise<Result<FeaturedMoviePage, TmdbError>>;
  discover(
    options?: DiscoverOptions,
  ): Promise<Result<FeaturedMoviePage, TmdbError>>;
  findByImdb(
    imdbId: string,
    options?: ListOptions,
  ): Promise<Result<FeaturedMovie | null, TmdbError>>;
}

const IMDB_ID = /^tt\d{7,9}$/;

function createDiscoverApi(transport: TmdbTransport): DiscoverApi {
  return {
    async trending(
      window,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!TRENDING_WINDOWS.includes(window)) {
        return err(tmdbErrors.invalidRequest(`Unknown window "${window}"`));
      }

      return transport.request({
        path: `/trending/movie/${window}`,
        query: { language, page },
        schema: featuredMoviePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover")],
        signal,
      });
    },

    async list(
      list,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!MOVIE_LISTS.includes(list)) {
        return err(tmdbErrors.invalidRequest(`Unknown list "${list}"`));
      }

      return transport.request({
        path: `/movie/${list}`,
        query: { language, page, region: "US" },
        schema: featuredMoviePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover")],
        signal,
      });
    },

    async discover({
      decade = null,
      genre = null,
      language = TMDB_DEFAULT_LANGUAGE,
      page = 1,
      signal,
      sort = "popularity.desc",
    } = {}) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!DISCOVER_SORTS.includes(sort)) {
        return err(tmdbErrors.invalidRequest(`Unknown sort "${sort}"`));
      }
      if (genre !== null && !Number.isSafeInteger(genre)) {
        return err(tmdbErrors.invalidRequest("Genre must be an integer"));
      }
      if (decade !== null && !Number.isSafeInteger(decade)) {
        return err(tmdbErrors.invalidRequest("Decade must be an integer"));
      }

      return transport.request({
        path: "/discover/movie",
        query: {
          language,
          page,
          include_adult: false,
          include_video: false,
          sort_by: sort,
          with_genres: genre ?? undefined,
          "primary_release_date.gte":
            decade === null ? undefined : `${decade}-01-01`,
          "primary_release_date.lte":
            decade !== null
              ? `${decade + 9}-12-31`
              : sort === "primary_release_date.desc"
                ? new Date().toISOString().slice(0, 10)
                : undefined,
          "vote_count.gte": MIN_VOTES[sort],
        },
        schema: featuredMoviePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover")],
        signal,
      });
    },

    async findByImdb(
      imdbId,
      { language = TMDB_DEFAULT_LANGUAGE, signal } = {},
    ) {
      const invalid = checkLanguage(language);
      if (invalid) return err(invalid);
      if (!IMDB_ID.test(imdbId)) {
        return err(tmdbErrors.invalidRequest(`Not an IMDb id: "${imdbId}"`));
      }

      const found = await transport.request({
        path: `/find/${imdbId}`,
        query: { external_source: "imdb_id", language },
        schema: foundMoviesSchema,
        revalidate: TMDB_REVALIDATE.movie,
        signal,
      });
      return found.success ? ok(found.data[0] ?? null) : found;
    },
  };
}

export interface TmdbClient {
  awards: AwardsApi;
  discover: DiscoverApi;
  movies: MoviesApi;
  people: PeopleApi;
}

export function createTmdbClient(options: TmdbTransportOptions): TmdbClient {
  const transport = createTmdbTransport(options);
  return {
    awards: createAwardsApi(options.onError),
    discover: createDiscoverApi(transport),
    movies: createMoviesApi(transport),
    people: createPeopleApi(transport),
  };
}
