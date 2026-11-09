import { err, ok, type Result } from "@omerdlw/base-framework/result";
import {
  foundShowsSchema,
  seasonDetailsSchema,
  showDetailsSchema,
  showPageSchema,
} from "./schemas";
import {
  GENRE,
  type SeasonDetails,
  type ShowDetails,
  type ShowPage,
  type ShowSummary,
  TMDB_DEFAULT_LANGUAGE,
  TMDB_REVALIDATE,
  tmdbCacheTag,
} from "./shared";
import {
  checkLanguage,
  checkPage,
  checkSearchInput,
  isTmdbId,
  type TmdbError,
  type TmdbTransport,
  tmdbErrors,
} from "./transport";

export interface ShowDetailsOptions {
  language?: string;
  signal?: AbortSignal;
}

export interface SeasonOptions extends ShowDetailsOptions {
  /** A season of a show still on air goes stale sooner. */
  airing?: boolean;
}

export interface ShowSearchOptions extends ShowDetailsOptions {
  page?: number;
  year?: number;
}

const SHOW_LISTS = [
  "airing_today",
  "on_the_air",
  "popular",
  "top_rated",
] as const;
export type ShowList = (typeof SHOW_LISTS)[number];

const SHOW_TRENDING_WINDOWS = ["day", "week"] as const;
type ShowTrendingWindow = (typeof SHOW_TRENDING_WINDOWS)[number];

const SHOW_DISCOVER_SORTS = [
  "popularity.desc",
  "vote_count.desc",
  "vote_average.desc",
  "first_air_date.desc",
] as const;
export type ShowDiscoverSort = (typeof SHOW_DISCOVER_SORTS)[number];

/** Shows collect fewer votes than films, so the floors sit lower. */
const SHOW_MIN_VOTES: Record<ShowDiscoverSort, number> = {
  "popularity.desc": 50,
  "vote_count.desc": 0,
  "vote_average.desc": 200,
  "first_air_date.desc": 15,
};

/** Unscripted genres never reach a discovery request (decision 10.4). */
const SHOW_WITHOUT_GENRES = [
  GENRE.documentary,
  GENRE.news,
  GENRE.reality,
  GENRE.soap,
  GENRE.talk,
].join(",");

export interface ShowListOptions {
  language?: string;
  page?: number;
  signal?: AbortSignal;
}

export interface ShowDiscoverOptions extends ShowListOptions {
  genre?: number | null;
  decade?: number | null;
  sort?: ShowDiscoverSort;
  originalLanguage?: string | null;
}

const APPENDED_RESOURCES = [
  "aggregate_credits",
  "images",
  "videos",
  "content_ratings",
  "recommendations",
  "watch/providers",
  "external_ids",
  "keywords",
].join(",");

const IMDB_ID = /^tt\d{7,9}$/;
const MAX_SEASON = 500;

export interface TvApi {
  getDetails(
    id: number,
    options?: ShowDetailsOptions,
  ): Promise<Result<ShowDetails, TmdbError>>;
  getSeason(
    id: number,
    season: number,
    options?: SeasonOptions,
  ): Promise<Result<SeasonDetails, TmdbError>>;
  search(
    query: string,
    options?: ShowSearchOptions,
  ): Promise<Result<ShowPage, TmdbError>>;
  trending(
    window: ShowTrendingWindow,
    options?: ShowListOptions,
  ): Promise<Result<ShowPage, TmdbError>>;
  list(
    list: ShowList,
    options?: ShowListOptions,
  ): Promise<Result<ShowPage, TmdbError>>;
  discover(options?: ShowDiscoverOptions): Promise<Result<ShowPage, TmdbError>>;
  findByImdb(
    imdbId: string,
    options?: ShowListOptions,
  ): Promise<Result<ShowSummary | null, TmdbError>>;
}

const badId = () =>
  err(tmdbErrors.invalidRequest("Show id must be a positive integer"));

export function createTvApi(transport: TmdbTransport): TvApi {
  return {
    async getDetails(id, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
      if (!isTmdbId(id)) return badId();
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/tv/${id}`,
        query: {
          language,
          append_to_response: APPENDED_RESOURCES,
          include_image_language: `${language.slice(0, 2)},null`,
        },
        schema: showDetailsSchema,
        revalidate: TMDB_REVALIDATE.tv,
        tags: [tmdbCacheTag("tv", id)],
        signal,
      });
    },

    async getSeason(
      id,
      season,
      { airing = false, language = TMDB_DEFAULT_LANGUAGE, signal } = {},
    ) {
      if (!isTmdbId(id)) return badId();
      if (!Number.isInteger(season) || season < 0 || season > MAX_SEASON) {
        return err(tmdbErrors.invalidRequest("Unknown season"));
      }
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/tv/${id}/season/${season}`,
        query: { language },
        schema: seasonDetailsSchema,
        revalidate: airing
          ? TMDB_REVALIDATE.airingSeason
          : TMDB_REVALIDATE.season,
        tags: [
          tmdbCacheTag("tv", id),
          tmdbCacheTag("tv", id, "season", season),
        ],
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
        path: "/search/tv",
        query: {
          query: checked.query,
          language,
          page,
          include_adult: false,
          ...(year ? { first_air_date_year: year } : {}),
        },
        schema: showPageSchema,
        revalidate: TMDB_REVALIDATE.search,
        signal,
      });
    },

    async trending(
      window,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!SHOW_TRENDING_WINDOWS.includes(window)) {
        return err(tmdbErrors.invalidRequest(`Unknown window "${window}"`));
      }

      return transport.request({
        path: `/trending/tv/${window}`,
        query: { language, page },
        schema: showPageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover", "tv")],
        signal,
      });
    },

    async list(
      list,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!SHOW_LISTS.includes(list)) {
        return err(tmdbErrors.invalidRequest(`Unknown list "${list}"`));
      }

      return transport.request({
        path: `/tv/${list}`,
        // airing lists follow a clock: pin it so results do not drift by viewer
        query: { language, page, timezone: "America/New_York" },
        schema: showPageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover", "tv")],
        signal,
      });
    },

    async discover({
      decade = null,
      genre = null,
      language = TMDB_DEFAULT_LANGUAGE,
      originalLanguage = null,
      page = 1,
      signal,
      sort = "popularity.desc",
    } = {}) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!SHOW_DISCOVER_SORTS.includes(sort)) {
        return err(tmdbErrors.invalidRequest(`Unknown sort "${sort}"`));
      }
      if (genre !== null && !Number.isSafeInteger(genre)) {
        return err(tmdbErrors.invalidRequest("Genre must be an integer"));
      }
      if (decade !== null && !Number.isSafeInteger(decade)) {
        return err(tmdbErrors.invalidRequest("Decade must be an integer"));
      }
      if (originalLanguage !== null && !/^[a-z]{2}$/.test(originalLanguage)) {
        return err(tmdbErrors.invalidRequest("Unknown original language"));
      }

      return transport.request({
        path: "/discover/tv",
        query: {
          language,
          page,
          include_adult: false,
          include_null_first_air_dates: false,
          sort_by: sort,
          with_genres: genre ?? undefined,
          without_genres: SHOW_WITHOUT_GENRES,
          with_original_language: originalLanguage ?? undefined,
          "first_air_date.gte": decade === null ? undefined : `${decade}-01-01`,
          "first_air_date.lte":
            decade !== null
              ? `${decade + 9}-12-31`
              : new Date().toISOString().slice(0, 10),
          "vote_count.gte": SHOW_MIN_VOTES[sort],
        },
        schema: showPageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover", "tv")],
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
        schema: foundShowsSchema,
        revalidate: TMDB_REVALIDATE.tv,
        signal,
      });
      return found.success ? ok(found.data[0] ?? null) : found;
    },
  };
}
