import "server-only";

import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { report, USER_MESSAGES } from "@omerdlw/base-framework/utils";
import { NextResponse } from "next/server";
import { filterEligible } from "@/features/catalog/quality";
import { getClientIp, rateLimitResponse } from "@/lib/security";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import {
  discoverMovies,
  getPersonDetails,
  searchMovies,
  searchPeople,
  searchShows,
} from "@/lib/tmdb/server";
import type { ShowSummary } from "@/lib/tmdb/shared";
import type { TmdbError } from "@/lib/tmdb/transport";
import {
  foldText,
  isSearchable,
  type ListSearchResponse,
  MATCH_SCORE,
  type MovieSearchResponse,
  normalizeQuery,
  type PersonSearchResponse,
  type ReviewSearchResponse,
  SEARCH_FALLBACK_MESSAGE,
  type SearchFailure,
  type SearchFailureCode,
  type SearchResponse,
  type SearchType,
  type UserSearchResponse,
} from "./query";

interface FilmCandidate {
  id: number;
  originalTitle: string | null;
  popularity: number;
  posterPath: string | null;
  releaseYear: number | null;
  title: string;
  voteCount: number;
}

interface SearchOptions {
  page?: number;
  signal?: AbortSignal;
}

type SearchRunner = (
  query: string,
  options: Required<SearchOptions>,
) => Promise<Result<SearchResponse<unknown>, SearchFailure>>;

const COMMUNITY_SEARCH_TYPES: readonly SearchType[] = [
  "users",
  "lists",
  "reviews",
];

const SEARCH_COMMUNITY_LIMIT = 12;

const ARTICLE_PATTERN = /^(?:the|a|an) (?=\S)/;

const ACRONYM_PATTERN = /^[\p{L}\p{N}]{2,8}$/u;

const SUBTITLE_PATTERN = /\s*(?::|\s[-–—]\s)/;

const SEQUEL_PATTERN = / (?:(?:vol(?:ume)?|part|chapter) )?(?:\d+|[ivx]+)$/;

const FRANCHISE_PATTERN = / and .*$/;

const RENOWN_VOTES = 20_000;

const RENOWN_WEIGHT = Object.freeze({
  follows: 1_000,
  likes: 300,
  movie: 100,
  person: 30,
  show: 100,
});

const CATALOG_PAGES = {
  "popularity.desc": 5,
  "vote_count.desc": 25,
} as const;

const CATALOG_MATCH_LIMIT = 8;

const CATALOG_MIN_FILMS = 100;

const CATALOG_LIFETIME_MS = 6 * 60 * 60 * 1000;

const INVALID_QUERY_FAILURE: SearchFailure = {
  code: "invalid_query",
  message: "Enter a valid search term",
};

const UNAVAILABLE_FAILURE: SearchFailure = {
  code: "unavailable",
  message: SEARCH_FALLBACK_MESSAGE,
};

const COMMUNITY_CANDIDATES = SEARCH_COMMUNITY_LIMIT * 2;

const FAILURE_MESSAGES: Record<SearchFailureCode, string> = {
  aborted: "The search was cancelled",
  invalid_query: "Enter a valid search term",
  rate_limited: USER_MESSAGES.rateLimited,
  unavailable: SEARCH_FALLBACK_MESSAGE,
};

const FAME_WEIGHT = 0.5;

const ORDER_WEIGHT = 0.15;

const YEAR_BONUS = 0.4;

const NO_PICTURE_PENALTY = 0.2;

const CREDIT_MATCH = 0.75;

const CREDIT_FILMS = 8;

const STANDOUT_RENOWN = 0.45;

const STANDOUT_LEAD = 1.5;

const FAILURE_STATUS: Record<SearchFailureCode, number> = {
  aborted: 499,
  invalid_query: 400,
  rate_limited: 429,
  unavailable: 503,
};

const PUBLIC_CACHE_CONTROL =
  "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";

const PRIVATE_CACHE_CONTROL = "private, max-age=30";

const FAILURE_CODE_BY_TMDB_KIND: Readonly<Record<string, SearchFailureCode>> = {
  invalid_request: "invalid_query",
  rate_limited: "rate_limited",
};

function excerpt(text: string, query: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;

  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  const start =
    at < 0
      ? 0
      : Math.max(0, Math.min(at - Math.floor(max / 4), flat.length - max));
  const end = start + max;
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}

function fold(value: string): string {
  return foldText(value.replace(/&/g, " and ")).trim();
}

function words(folded: string): string[] {
  return folded ? folded.split(" ") : [];
}

function initials(title: string): string {
  return words(title)
    .map((word) => word[0])
    .join("");
}

function isAcronym(text: string, needle: string): boolean {
  if (!ACRONYM_PATTERN.test(needle)) return false;
  const main = fold(text.split(SUBTITLE_PATTERN)[0]);
  const names = [
    fold(text),
    main,
    main.replace(SEQUEL_PATTERN, ""),
    main.replace(FRANCHISE_PATTERN, ""),
  ];
  return names.some(
    (name) =>
      initials(name) === needle ||
      initials(name.replace(ARTICLE_PATTERN, "")) === needle,
  );
}

function textMatch(text: string | null | undefined, query: string): number {
  const haystack = fold(text ?? "");
  const needle = fold(query);
  if (!haystack || !needle) return 0;

  const bareHaystack = haystack.replace(ARTICLE_PATTERN, "");
  const bareNeedle = needle.replace(ARTICLE_PATTERN, "");
  if (haystack === needle || bareHaystack === bareNeedle)
    return MATCH_SCORE.exact;
  if (isAcronym(text ?? "", needle)) return MATCH_SCORE.acronym;
  if (
    haystack.startsWith(`${needle} `) ||
    bareHaystack.startsWith(`${bareNeedle} `)
  ) {
    return MATCH_SCORE.prefix;
  }
  if (haystack.startsWith(needle) || bareHaystack.startsWith(bareNeedle)) {
    return MATCH_SCORE.partialPrefix;
  }

  const have = words(haystack);
  const covered =
    MATCH_SCORE.coverage * Math.min(1, words(needle).length / have.length);
  const padded = ` ${haystack} `;
  if (padded.includes(` ${needle} `)) return MATCH_SCORE.phrase + covered;
  if (padded.includes(` ${needle}`)) return MATCH_SCORE.phraseStart + covered;

  const want = [...new Set(words(needle))];
  const found = want.filter((word) =>
    have.some((candidate) => candidate.startsWith(word)),
  ).length;
  if (found === want.length) return MATCH_SCORE.allWords + covered;
  if (haystack.includes(needle)) return MATCH_SCORE.substring;
  return (MATCH_SCORE.substring * found) / want.length;
}

function bestMatch(
  texts: readonly (string | null | undefined)[],
  query: string,
): number {
  return texts.reduce(
    (best, text) => Math.max(best, textMatch(text, query)),
    0,
  );
}

function splitYear(
  query: string,
  now: Date = new Date(),
): { title: string; year: number } | null {
  const found = /^(.*\S)\s+\(?(\d{4})\)?$/.exec(query.trim());
  if (!found) return null;
  const year = Number(found[2]);
  if (year < 1874 || year > now.getFullYear() + 1) return null;
  return { title: found[1], year };
}

function fame(
  rows: readonly { popularity: number; votes?: number }[],
): number[] {
  const loudest = (pick: (row: (typeof rows)[number]) => number) =>
    Math.log1p(Math.max(0, ...rows.map(pick)));
  const popularity = loudest((row) => row.popularity);
  const votes = loudest((row) => row.votes ?? 0);

  return rows.map((row) => {
    const p = popularity ? Math.log1p(row.popularity) / popularity : 0;
    if (row.votes === undefined) return p;
    const v = votes ? Math.log1p(row.votes) / votes : 0;
    return 0.6 * Math.max(p, v) + 0.4 * ((p + v) / 2);
  });
}

function renown(
  row: { popularity: number; votes?: number },
  reference: number,
): number {
  const scale = (value: number, top: number) =>
    Math.min(1, Math.log1p(Math.max(0, value)) / Math.log1p(top));
  const p = scale(row.popularity, reference);
  if (row.votes === undefined) return p;
  const v = scale(row.votes, RENOWN_VOTES);
  return 0.6 * Math.max(p, v) + 0.4 * ((p + v) / 2);
}

function orderWeight(index: number, length: number): number {
  return length > 1 ? 1 - index / length : 1;
}

function prepareQuery(query: string, { handle = false } = {}): string | null {
  const normalized = normalizeQuery(handle ? query.replace(/^@+/, "") : query);
  if (!isSearchable(normalized)) return null;

  const text = normalized
    .replace(/[\\%_,()*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length < 2 ? null : text;
}

function searchResponse<Hit>(hits: Hit[]): SearchResponse<Hit> {
  return { hits, page: 1, totalPages: 1, totalResults: hits.length };
}

function failUnavailable(
  name: string,
  error: unknown,
): Result<never, SearchFailure> {
  report(name, error);
  return err(UNAVAILABLE_FAILURE);
}

function toSearchFailure(error: TmdbError): SearchFailure {
  const code = FAILURE_CODE_BY_TMDB_KIND[error.kind] ?? "unavailable";
  return { code, message: FAILURE_MESSAGES[code] };
}

function byScore<T>(rows: { hit: T; score: number }[]): T[] {
  return rows.sort((a, b) => b.score - a.score).map(({ hit }) => hit);
}

let catalogCache: { at: number; films: Promise<FilmCandidate[]> } | null = null;

async function loadCatalog(): Promise<FilmCandidate[]> {
  const requests = Object.entries(CATALOG_PAGES).flatMap(([sort, pages]) =>
    Array.from({ length: pages }, (_, index) =>
      discoverMovies({
        page: index + 1,
        sort: sort as keyof typeof CATALOG_PAGES,
      }),
    ),
  );
  const pages = await Promise.all(requests);

  const films = new Map<number, FilmCandidate>();
  for (const page of pages) {
    if (!page.success) continue;
    for (const movie of page.data.results) {
      films.set(movie.id, {
        id: movie.id,
        originalTitle: null,
        popularity: movie.popularity,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        title: movie.title,
        voteCount: movie.voteCount,
      });
    }
  }
  if (films.size < CATALOG_MIN_FILMS) catalogCache = null;
  return [...films.values()];
}

function getCatalog(): Promise<FilmCandidate[]> {
  if (!catalogCache || Date.now() - catalogCache.at > CATALOG_LIFETIME_MS) {
    catalogCache = { at: Date.now(), films: loadCatalog() };
  }
  return catalogCache.films;
}

async function catalogMatches(
  query: string,
  limit = CATALOG_MATCH_LIMIT,
): Promise<FilmCandidate[]> {
  const films = await getCatalog().catch(() => []);
  return films
    .map((film) => ({ film, match: textMatch(film.title, query) }))
    .filter(({ match }) => match >= MATCH_SCORE.phraseStart)
    .sort((a, b) => b.match - a.match || b.film.voteCount - a.film.voteCount)
    .slice(0, limit)
    .map(({ film }) => film);
}

export async function searchUserHits(
  query: string,
): Promise<Result<UserSearchResponse, SearchFailure>> {
  const text = prepareQuery(query, { handle: true });
  if (!text) return err(INVALID_QUERY_FAILURE);

  try {
    const client = createAdminSupabaseClient();
    const { data, error } = await client.rpc("search_accounts", {
      p_limit: COMMUNITY_CANDIDATES,
      p_query: text,
    });
    if (error) throw error;

    const hits = (data ?? [])
      .flatMap((row) => {
        if (!row.username) return [];
        const followersCount = row.followers_count ?? 0;
        const match = bestMatch([row.username, row.display_name], text);
        return [
          {
            avatarUrl: row.avatar_url,
            displayName: row.display_name?.trim() || row.username,
            followersCount,
            id: row.id,
            isPrivate: row.is_private,
            match,
            score:
              match +
              renown({ popularity: followersCount }, RENOWN_WEIGHT.follows),
            username: row.username,
          },
        ];
      })
      .sort((a, b) => b.match - a.match || b.followersCount - a.followersCount)
      .slice(0, SEARCH_COMMUNITY_LIMIT);

    return ok(searchResponse(hits));
  } catch (error) {
    return failUnavailable("Search users", error);
  }
}

export async function searchListHits(
  query: string,
): Promise<Result<ListSearchResponse, SearchFailure>> {
  const text = prepareQuery(query);
  if (!text) return err(INVALID_QUERY_FAILURE);

  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("search_lists", {
      p_limit: COMMUNITY_CANDIDATES,
      p_query: text,
    });
    if (error) throw error;

    const hits = (data ?? [])
      .flatMap((row) => {
        const match = textMatch(row.title, text);
        return row.owner_username
          ? [
              {
                id: row.id,
                itemsCount: row.items_count,
                likesCount: row.likes_count,
                match,
                owner: {
                  displayName:
                    row.owner_display_name?.trim() || row.owner_username,
                  username: row.owner_username,
                },
                posterPath: row.poster_path,
                score:
                  match +
                  renown({ popularity: row.likes_count }, RENOWN_WEIGHT.likes),
                slug: row.slug,
                title: row.title,
              },
            ]
          : [];
      })
      .sort((a, b) => b.match - a.match || b.likesCount - a.likesCount)
      .slice(0, SEARCH_COMMUNITY_LIMIT);

    return ok(searchResponse(hits));
  } catch (error) {
    return failUnavailable("Search lists", error);
  }
}

export async function searchReviewHits(
  query: string,
): Promise<Result<ReviewSearchResponse, SearchFailure>> {
  const text = prepareQuery(query);
  if (!text) return err(INVALID_QUERY_FAILURE);

  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("search_reviews", {
      p_limit: COMMUNITY_CANDIDATES,
      p_query: text,
    });
    if (error) throw error;

    const said = fold(text);
    const hits = (data ?? []).flatMap((row) => {
      if (!row.author_username) return [];
      const year = row.release_date
        ? Number(row.release_date.slice(0, 4))
        : null;
      const match = Math.max(
        textMatch(row.title, text),
        fold(row.content).includes(said) ? MATCH_SCORE.substring : 0,
      );
      return [
        {
          author: {
            avatarUrl: row.author_avatar_url,
            displayName: row.author_display_name?.trim() || row.author_username,
            username: row.author_username,
          },
          excerpt: row.is_spoiler ? "" : excerpt(row.content, text),
          id: row.id,
          isSpoiler: row.is_spoiler,
          likesCount: row.likes_count,
          match,
          posterPath: row.poster_path,
          rating: row.rating === null ? null : Number(row.rating),
          score:
            match +
            renown({ popularity: row.likes_count }, RENOWN_WEIGHT.likes),
          title: row.title ?? "Untitled",
          tmdbId: row.tmdb_id,
          year: year !== null && Number.isFinite(year) ? year : null,
        },
      ];
    });
    hits.sort((a, b) => b.match - a.match || b.likesCount - a.likesCount);

    return ok(searchResponse(hits.slice(0, SEARCH_COMMUNITY_LIMIT)));
  } catch (error) {
    return failUnavailable("Search reviews", error);
  }
}

async function standoutCredits(
  query: string,
  signal?: AbortSignal,
): Promise<{ films: FilmCandidate[]; score: number } | null> {
  const found = await searchPeople(query, { signal });
  if (!found.success) return null;

  const named = found.data.results
    .filter((person) => bestMatch([person.name], query) >= MATCH_SCORE.phrase)
    .sort((a, b) => b.popularity - a.popularity);
  const [first, second] = named;
  if (!first || renown(first, RENOWN_WEIGHT.person) < STANDOUT_RENOWN)
    return null;
  if (second && first.popularity < second.popularity * STANDOUT_LEAD) {
    return null;
  }

  const details = await getPersonDetails(first.id);
  if (!details.success) return null;
  const { credits, knownForDepartment: department } = details.data;
  const work =
    department === "Acting" || !department
      ? credits.cast
      : credits.crew.filter(
          (credit) =>
            credit.department === department &&
            (department !== "Directing" || credit.job === "Director"),
        );

  const seen = new Set<number>();
  const films = [...work]
    .sort((a, b) => b.voteCount - a.voteCount)
    .filter((film) => !seen.has(film.id) && Boolean(seen.add(film.id)))
    .slice(0, CREDIT_FILMS);
  return {
    films,
    score: bestMatch([first.name], query) + renown(first, RENOWN_WEIGHT.person),
  };
}

export async function searchShowHits(
  query: string,
  options: SearchOptions = {},
): Promise<Result<MovieSearchResponse, SearchFailure>> {
  const dated = splitYear(query);
  const [plain, narrowed] = await Promise.all([
    searchShows(query, options),
    dated
      ? searchShows(dated.title, { ...options, year: dated.year })
      : Promise.resolve(null),
  ]);
  if (!plain.success && !narrowed?.success) {
    return err(toSearchFailure(plain.error));
  }

  const pages = [narrowed, plain].flatMap((result) =>
    result?.success ? [result.data] : [],
  );
  const heard = (title: string | null) =>
    Math.max(
      bestMatch([title], query),
      dated ? bestMatch([title], dated.title) : 0,
    );
  const rows = new Map<number, { order: number; show: ShowSummary }>();
  for (const { results } of pages) {
    const eligible = filterEligible(results, "tv", "search");
    eligible.forEach((show, index) => {
      if (!rows.has(show.id)) {
        rows.set(show.id, { order: orderWeight(index, eligible.length), show });
      }
    });
  }

  const list = [...rows.values()];
  const known = fame(
    list.map(({ show }) => ({
      popularity: show.popularity,
      votes: show.voteCount,
    })),
  );
  const hits = byScore(
    list.map(({ order, show }, index) => {
      const byTitle = heard(show.title);
      const byOriginal = heard(show.originalTitle);
      const match = Math.max(byTitle, byOriginal);
      const year = dated && show.releaseYear === dated.year ? YEAR_BONUS : 0;
      const signals = { popularity: show.popularity, votes: show.voteCount };
      return {
        hit: {
          id: show.id,
          match,
          originalTitle: byOriginal > byTitle ? show.originalTitle : null,
          posterPath: show.posterPath,
          score: match + year + renown(signals, RENOWN_WEIGHT.show),
          title: show.title,
          year: show.releaseYear,
        },
        score:
          match +
          year +
          FAME_WEIGHT * known[index]! +
          ORDER_WEIGHT * order -
          (show.posterPath ? 0 : NO_PICTURE_PENALTY),
      };
    }),
  );

  const { page, totalPages, totalResults } = plain.success
    ? plain.data
    : pages[0]!;
  return ok({ hits, page, totalPages, totalResults });
}

export async function searchMovieHits(
  query: string,
  options: SearchOptions = {},
): Promise<Result<MovieSearchResponse, SearchFailure>> {
  const dated = splitYear(query);
  const first = (options.page ?? 1) === 1;
  const [plain, narrowed, typed, standout] = await Promise.all([
    searchMovies(query, options),
    dated
      ? searchMovies(dated.title, { ...options, year: dated.year })
      : Promise.resolve(null),
    first ? catalogMatches(query) : Promise.resolve([]),
    first
      ? standoutCredits(query, options.signal).catch(() => null)
      : Promise.resolve(null),
  ]);
  if (!plain.success && !narrowed?.success) {
    return err(toSearchFailure(plain.error));
  }

  const pages = [narrowed, plain].flatMap((result) =>
    result?.success ? [result.data] : [],
  );
  const heard = (title: string | null) =>
    Math.max(
      bestMatch([title], query),
      dated ? bestMatch([title], dated.title) : 0,
    );
  const titled = [...pages.flatMap(({ results }) => results), ...typed].filter(
    (film) =>
      Math.max(heard(film.title), heard(film.originalTitle)) >=
      MATCH_SCORE.strong,
  );
  const credited =
    standout &&
    Math.max(0, ...titled.map((film) => film.voteCount)) <=
      Math.max(0, ...standout.films.map((film) => film.voteCount))
      ? standout
      : null;
  const creditIds = new Set(credited?.films.map((film) => film.id));
  const rows = new Map<number, { film: FilmCandidate; order: number }>();
  const add = (film: FilmCandidate, order: number) => {
    if (!rows.has(film.id)) rows.set(film.id, { film, order });
  };
  for (const { results } of pages) {
    results.forEach((movie, index) =>
      add(movie, orderWeight(index, results.length)),
    );
  }
  typed.forEach((film) => add(film, 0.5));
  credited?.films.forEach((film) => add(film, 0.5));

  const list = [...rows.values()];
  const known = fame(
    list.map(({ film }) => ({
      popularity: film.popularity,
      votes: film.voteCount,
    })),
  );

  const hits = byScore(
    list.map(({ film, order }, index) => {
      const credit = creditIds.has(film.id);
      const byTitle = heard(film.title);
      const byOriginal = heard(film.originalTitle);
      const match = Math.max(byTitle, byOriginal, credit ? CREDIT_MATCH : 0);
      const year = dated && film.releaseYear === dated.year ? YEAR_BONUS : 0;
      const signals = { popularity: film.popularity, votes: film.voteCount };
      const standing = match + year + renown(signals, RENOWN_WEIGHT.movie);
      return {
        hit: {
          id: film.id,
          match,
          originalTitle: byOriginal > byTitle ? film.originalTitle : null,
          posterPath: film.posterPath,
          score:
            credit && credited
              ? Math.min(standing, credited.score - 0.01)
              : standing,
          title: film.title,
          year: film.releaseYear,
        },
        score:
          match +
          year +
          FAME_WEIGHT * known[index] +
          ORDER_WEIGHT * order -
          (film.posterPath ? 0 : NO_PICTURE_PENALTY),
      };
    }),
  );

  const { page, totalPages, totalResults } = plain.success
    ? plain.data
    : pages[0];
  return ok({ hits, page, totalPages, totalResults });
}

export async function searchPersonHits(
  query: string,
  options: SearchOptions = {},
): Promise<Result<PersonSearchResponse, SearchFailure>> {
  const result = await searchPeople(query, options);
  if (!result.success) return err(toSearchFailure(result.error));

  const { page, results, totalPages, totalResults } = result.data;
  const known = fame(results.map(({ popularity }) => ({ popularity })));

  const hits = byScore(
    results.map((person, index) => {
      const match = bestMatch([person.name], query);
      return {
        hit: {
          department: person.knownForDepartment,
          id: person.id,
          knownFor: person.knownFor.slice(0, 2),
          match,
          name: person.name,
          profilePath: person.profilePath,
          score: match + renown(person, RENOWN_WEIGHT.person),
        },
        score:
          match +
          FAME_WEIGHT * known[index] +
          ORDER_WEIGHT * orderWeight(index, results.length) -
          (person.profilePath ? 0 : NO_PICTURE_PENALTY),
      };
    }),
  );

  return ok({ hits, page, totalPages, totalResults });
}

export function createSearchHandler(type: SearchType, search: SearchRunner) {
  const cacheControl = COMMUNITY_SEARCH_TYPES.includes(type)
    ? PRIVATE_CACHE_CONTROL
    : PUBLIC_CACHE_CONTROL;

  return async function GET(request: Request): Promise<Response> {
    const limited = await rateLimitResponse(
      `search:${type}:${getClientIp(request)}`,
      60,
    );
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const page = searchParams.has("page")
      ? Number(searchParams.get("page"))
      : 1;

    const result = await search(searchParams.get("q") ?? "", {
      page,
      signal: request.signal,
    });

    if (!result.success) {
      return NextResponse.json(
        { code: result.error.code, error: result.error.message },
        { status: FAILURE_STATUS[result.error.code] },
      );
    }
    return NextResponse.json(
      { data: result.data },
      { headers: { "Cache-Control": cacheControl } },
    );
  };
}
