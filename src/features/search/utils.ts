import { err, type Result } from "@omerdlw/base-framework/result";
import { report } from "@omerdlw/base-framework/utils";
import {
  accountHref,
  listHref,
  movieHref,
  tvHref,
  personHref,
  reviewHref,
} from "@/lib/project";
import type { TmdbError } from "@/lib/tmdb/transport";
import {
  ACRONYM_PATTERN,
  ARTICLE_PATTERN,
  DISTANT_MATCH,
  FAILURE_CODE_BY_TMDB_KIND,
  FAILURE_MESSAGES,
  FRANCHISE_PATTERN,
  MATCH_SCORE,
  RENOWN_VOTES,
  SEARCH_FALLBACK_MESSAGE,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_OVERVIEW,
  SEARCH_OVERVIEW_LEAD,
  SEARCH_PER_PAGE,
  ACTIVE_SEARCH_TYPES,
  SEQUEL_PATTERN,
  SUBTITLE_PATTERN,
  TMDB_SEARCH_TYPES,
  UNAVAILABLE_FAILURE,
} from "./constants";
import type {
  SearchAnswers,
  SearchFailure,
  SearchFailureCode,
  SearchResponse,
  SearchResponseMap,
  SearchResults,
  SearchScope,
  SearchSection,
  SearchType,
  SearchView,
} from "./types";

export function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isSearchable(query: string): boolean {
  return (
    query.length >= SEARCH_MIN_QUERY_LENGTH &&
    query.length <= SEARCH_MAX_QUERY_LENGTH
  );
}

export function excerpt(text: string, query: string, max = 140): string {
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

function foldText(value: string): string {
  return value
    .replace(/[ıİ]/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
}

export function fold(value: string): string {
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

export function textMatch(
  text: string | null | undefined,
  query: string,
): number {
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

export function bestMatch(
  texts: readonly (string | null | undefined)[],
  query: string,
): number {
  return texts.reduce(
    (best, text) => Math.max(best, textMatch(text, query)),
    0,
  );
}

export function splitYear(
  query: string,
  now: Date = new Date(),
): { title: string; year: number } | null {
  const found = /^(.*\S)\s+\(?(\d{4})\)?$/.exec(query.trim());
  if (!found) return null;
  const year = Number(found[2]);
  if (year < 1874 || year > now.getFullYear() + 1) return null;
  return { title: found[1], year };
}

export function fame(
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

export function renown(
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

export function orderWeight(index: number, length: number): number {
  return length > 1 ? 1 - index / length : 1;
}

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

export function arrange(
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

export function hrefsOf(item: SearchSection): string[] {
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

export const searchError = (
  code: SearchFailureCode,
  message = SEARCH_FALLBACK_MESSAGE,
): Result<never, SearchFailure> => err({ code, message });

export function isSearchResponse(
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

export const answerKey = (kind: SearchType, query: string) =>
  `${kind}:${query.toLowerCase()}`;

export function kindsOf(scope: SearchScope): readonly SearchType[] {
  return scope === "all" ? ACTIVE_SEARCH_TYPES : [scope];
}

export function collectAnswers(
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

function folded(text: string): { origin: number[]; value: string } {
  let value = "";
  const origin: number[] = [];
  for (let index = 0; index < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(index) ?? 0);
    for (const piece of foldText(char)) {
      if (piece === " " && (value === "" || value.endsWith(" "))) continue;
      value += piece;
      origin.push(index);
    }
    index += char.length;
  }
  return { origin, value };
}

export function locateMatch(
  text: string,
  query: string,
): [number, number] | null {
  const needle = folded(query).value.trim();
  if (!needle) return null;
  const { origin, value } = folded(text);

  const atWord = ` ${value}`.indexOf(` ${needle}`);
  const at = atWord >= 0 ? atWord : value.indexOf(needle);
  if (at < 0) return null;

  const last = origin[at + needle.length - 1];
  const end = last + String.fromCodePoint(text.codePointAt(last) ?? 0).length;
  return [origin[at], end];
}

export function prepareQuery(
  query: string,
  { handle = false } = {},
): string | null {
  const normalized = normalizeQuery(handle ? query.replace(/^@+/, "") : query);
  if (!isSearchable(normalized)) return null;

  const text = normalized
    .replace(/[\\%_,()*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length < 2 ? null : text;
}

export function searchResponse<Hit>(hits: Hit[]): SearchResponse<Hit> {
  return { hits, page: 1, totalPages: 1, totalResults: hits.length };
}

export function failUnavailable(
  name: string,
  error: unknown,
): Result<never, SearchFailure> {
  report(name, error);
  return err(UNAVAILABLE_FAILURE);
}

export function toSearchFailure(error: TmdbError): SearchFailure {
  const code = FAILURE_CODE_BY_TMDB_KIND[error.kind] ?? "unavailable";
  return { code, message: FAILURE_MESSAGES[code] };
}

export function byScore<T>(rows: { hit: T; score: number }[]): T[] {
  return rows.sort((a, b) => b.score - a.score).map(({ hit }) => hit);
}

export function offsetIn(list: HTMLElement, option: HTMLElement) {
  // Layout units, unrounded: offsetLeft/offsetWidth round to whole pixels,
  // which skews a halo around fractional-width tiles by up to a pixel.
  const box = list.getBoundingClientRect();
  const rect = option.getBoundingClientRect();
  const scale = list.offsetWidth ? box.width / list.offsetWidth : 1;
  return {
    height: rect.height / scale,
    width: rect.width / scale,
    x: (rect.left - box.left) / scale - list.clientLeft + list.scrollLeft,
    y: (rect.top - box.top) / scale - list.clientTop + list.scrollTop,
  };
}
