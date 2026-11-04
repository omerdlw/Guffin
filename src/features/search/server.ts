import "server-only";
import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { NextResponse } from "next/server";
import { getClientIp, rateLimitResponse } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  discoverMovies,
  getPersonDetails,
  searchMovies,
  searchPeople,
} from "@/lib/tmdb/server";
import {
  CATALOG_LIFETIME_MS,
  CATALOG_PAGES,
  COMMUNITY_CANDIDATES,
  COMMUNITY_SEARCH_TYPES,
  CREDIT_FILMS,
  CREDIT_MATCH,
  FAILURE_STATUS,
  FAME_WEIGHT,
  INVALID_QUERY_FAILURE,
  MATCH_SCORE,
  NO_PICTURE_PENALTY,
  ORDER_WEIGHT,
  PRIVATE_CACHE_CONTROL,
  PUBLIC_CACHE_CONTROL,
  RENOWN_WEIGHT,
  SEARCH_COMMUNITY_LIMIT,
  STANDOUT_LEAD,
  STANDOUT_RENOWN,
  YEAR_BONUS,
} from "./constants";
import type {
  CatalogFilm,
  ListSearchResponse,
  MovieSearchResponse,
  PersonSearchResponse,
  ReviewSearchResponse,
  SearchFailure,
  SearchFilm,
  SearchRunner,
  SearchType,
  UserSearchResponse,
} from "./types";
import {
  bestMatch,
  byScore,
  excerpt,
  failUnavailable,
  fame,
  fold,
  orderWeight,
  prepareQuery,
  renown,
  searchResponse,
  splitYear,
  textMatch,
  toSearchFailure,
} from "./utils";

let loaded: { at: number; films: Promise<CatalogFilm[]> } | null = null;

async function load(): Promise<CatalogFilm[]> {
  const requests = Object.entries(CATALOG_PAGES).flatMap(([sort, pages]) =>
    Array.from({ length: pages }, (_, index) =>
      discoverMovies({
        page: index + 1,
        sort: sort as keyof typeof CATALOG_PAGES,
      }),
    ),
  );
  const pages = await Promise.all(requests);

  const films = new Map<number, CatalogFilm>();
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
  if (films.size < 100) loaded = null;
  return [...films.values()];
}

function catalog(): Promise<CatalogFilm[]> {
  if (!loaded || Date.now() - loaded.at > CATALOG_LIFETIME_MS) {
    loaded = { at: Date.now(), films: load() };
  }
  return loaded.films;
}

async function catalogMatches(
  query: string,
  limit = 8,
): Promise<CatalogFilm[]> {
  const films = await catalog().catch(() => []);
  return films
    .map((film) => ({ film, match: textMatch(film.title, query) }))
    .filter(({ match }) => match >= MATCH_SCORE.phraseStart)
    .sort((a, b) => b.match - a.match || b.film.voteCount - a.film.voteCount)
    .slice(0, limit)
    .map(({ film }) => film);
}

export async function searchUserHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<UserSearchResponse, SearchFailure>> {
  void options;
  const text = prepareQuery(query, { handle: true });
  if (!text) return err(INVALID_QUERY_FAILURE);

  try {
    const client = await createServerSupabaseClient();
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
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<ListSearchResponse, SearchFailure>> {
  void options;
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
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<ReviewSearchResponse, SearchFailure>> {
  void options;
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
): Promise<{ films: SearchFilm[]; score: number } | null> {
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

export async function searchMovieHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
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
  const rows = new Map<number, { film: SearchFilm; order: number }>();
  const add = (film: SearchFilm, order: number) => {
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
  options: { page?: number; signal?: AbortSignal } = {},
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
